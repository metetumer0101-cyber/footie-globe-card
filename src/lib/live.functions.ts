import { createServerFn } from "@tanstack/react-start";
import {
  mapFixtureRow,
  mockTransfers,
  type ApiFootballFixture,
  type LiveFeed,
  type LiveFixture,
  type TransferHistory,
} from "@/lib/live";
import { cached } from "@/lib/api-cache.server";
import { TTL } from "@/lib/freshness-config";
import { apiFootball, apiFootballKey } from "@/lib/api-football.server";
import {
  isSportMonksEnabled,
  sportMonks,
  sportMonksCached,
  type SportMonksList,
} from "@/lib/api-sportmonks.server";
import { mapSmFixture, type SMFixture } from "@/lib/sportmonks.mappers";
import { isQuotaExhausted } from "@/lib/system-status.server";
import { ensureMidnightRefresh } from "@/lib/midnight-refresh.server";
import { utcDateKey } from "@/services/dailyEngine";

const LIVE_SNAPSHOT_TTL = 30;

/**
 * A feed with no fixtures — used as the honest "no live data" state instead of
 * a fabricated local mock. Consumers (e.g. the home page) treat an empty
 * fixtures list as "no real live data to show" and never invent scores. The
 * `quotaExhausted` flag lets them show a clear quota empty-state card.
 */
function emptyFeed(): LiveFeed {
  return {
    date: utcDateKey(new Date()),
    source: "api-football",
    fixtures: [],
    quotaExhausted: isQuotaExhausted(),
  };
}

/**
 * Secure server-side proxy for API-Football.
 *
 * Two cached layers, merged:
 *  - Daily schedule (`/fixtures?date=…`, 5 min cache) — every match today,
 *    scheduled or finished.
 *  - In-play snapshot (`/fixtures?live=all`, 30 s cache) — covers matches in
 *    leagues outside the daily window and refreshes live scores fast.
 *
 * No mock fallback: a missing key, rate limit or upstream failure yields an
 * empty feed (`source: "api-football"`, zero fixtures) so the UI can clearly
 * communicate that no real live data is available rather than faking it.
 */
/**
 * SportMonks-backed live feed. Uses `/fixtures/date/{date}` for the daily
 * schedule (which on this plan also includes in-play matches, so it doubles as
 * the live view). `/fixtures/live` requires undocumented params and 422s on the
 * current plan, so it's attempted and safely ignored when it fails. Team names
 * are parsed from the composite `name` field because the `localTeam`/`visitorTeam`
 * includes are plan-gated (404). Scores/`time` are only present when those
 * includes are granted, so the mapper falls back to 0 / no-minute defensively.
 */
async function getLiveFeedSportMonks(date: string): Promise<LiveFeed> {
  const map = (rows: SMFixture[], prefix: string) => rows.map((r, i) => mapSmFixture(r, `${prefix}-${i}`));

  const daily = await sportMonksCached<LiveFixture[] | null>(
    `fixtures-day:${date}`,
    TTL.FIXTURES,
    async () => {
      const json = await sportMonks<SportMonksList<SMFixture>>({
        path: `/fixtures/date/${date}`,
        include: ["league"],
      });
      const rows = json?.data ?? [];
      if (!rows.length) return null;
      return map(rows, date);
    },
    null,
  );

  const liveNow = await sportMonksCached<LiveFixture[]>(
    "live-all",
    LIVE_SNAPSHOT_TTL,
    async () => {
      // Plan-gated / undocumented: returns 422 on the current plan; ignore it.
      const json = await sportMonks<SportMonksList<SMFixture>>({ path: "/fixtures/live", include: ["league"] });
      return map(json?.data ?? [], "live");
    },
    [],
  );

  if (!daily?.length && !liveNow.length) return emptyFeed();
  const byId = new Map((daily ?? []).map((f) => [f.id, f]));
  for (const live of liveNow) byId.set(live.id, live);
  return { date, source: "api-football", fixtures: [...byId.values()], quotaExhausted: isQuotaExhausted() };
}

export const getLiveFeed = createServerFn({ method: "GET" }).handler(async (): Promise<LiveFeed> => {
  // Any live-feed request keeps the UTC-midnight cache invalidation + warm
  // refresh timer armed, so the daily quota reset is handled automatically.
  ensureMidnightRefresh();
  const date = utcDateKey(new Date());

  if (isSportMonksEnabled()) {
    return getLiveFeedSportMonks(date);
  }

  const apiKey = apiFootballKey();
  if (!apiKey) return emptyFeed();

  const daily = await cached<LiveFixture[] | null>(
    `fixtures-day:${date}`,
    TTL.FIXTURES,
    async () => {
      const json = await apiFootball<{ response?: ApiFootballFixture[] }>(
        `/fixtures?date=${date}`,
        apiKey,
      );
      const rows = json?.response ?? [];
      if (!rows.length) return null;
      return rows.map((r, i) => mapFixtureRow(r, `${date}-${i}`));
    },
    null,
  );

  const liveNow = await cached<LiveFixture[]>(
    "live-all",
    LIVE_SNAPSHOT_TTL,
    async () => {
      const json = await apiFootball<{ response?: ApiFootballFixture[] }>(
        "/fixtures?live=all",
        apiKey,
      );
      // An empty in-play list is a valid result and caches like any other.
      return (json?.response ?? []).map((r, i) => mapFixtureRow(r, `live-${i}`));
    },
    [],
  );

  if (!daily?.length && !liveNow.length) return emptyFeed();

  // Live snapshot wins over the (older) daily schedule row for the same match.
  const byId = new Map((daily ?? []).map((f) => [f.id, f]));
  for (const live of liveNow) byId.set(live.id, live);

  return { date, source: "api-football", fixtures: [...byId.values()], quotaExhausted: isQuotaExhausted() };
});

/**
 * Historical transfer data for a player, cached for 6h so fresh moves show up
 * the same day. Falls back to the local mock transfer history.
 */
export const getPlayerTransfers = createServerFn({ method: "GET" })
  .inputValidator((input: { playerId: string; apiPlayerId?: number }) => input)
  .handler(async ({ data }): Promise<TransferHistory> => {
    if (isSportMonksEnabled()) {
      // SportMonks has no granted transfers route on the current plan
      // (`/transfers/*` 404, `?include=transfers` not granted). Return an honest
      // empty history instead of the local mock so no fabricated moves show.
      const empty: TransferHistory = { playerId: data.playerId, source: "api-football", moves: [] };
      if (!data.apiPlayerId) return empty;
      const json = await sportMonks<{
        data?: { transfers?: { data?: { date?: string; type?: string; team_name?: string }[] }[] } | null;
      }>({ path: `/transfers/player/${data.apiPlayerId}` });
      void json; // route is plan-gated; keep the call for future plans
      return empty;
    }

    const fallback = mockTransfers(data.playerId);
    const apiKey = apiFootballKey();
    if (!apiKey || !data.apiPlayerId) return fallback;

    return cached<TransferHistory>(
      `transfers:${data.apiPlayerId}`,
      TTL.TRANSFERS,
      async () => {
        const json = await apiFootball<{
          response?: { transfers?: { date?: string; teams?: { in?: { name?: string }; out?: { name?: string } } }[] }[];
        }>(`/transfers?player=${data.apiPlayerId}`, apiKey);
        const rows = json?.response?.[0]?.transfers ?? [];
        if (!rows.length) return null;
        return {
          playerId: data.playerId,
          source: "api-football",
          moves: rows.map((tr) => ({
            date: tr.date ?? "",
            from: tr.teams?.out?.name ?? "—",
            to: tr.teams?.in?.name ?? "—",
          })),
        } satisfies TransferHistory;
      },
      fallback,
    );
  });
