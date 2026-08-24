import { createServerFn } from "@tanstack/react-start";
import { mockTransfers, type LiveFeed, type LiveFixture, type TransferHistory } from "@/lib/live";
import { TTL } from "@/lib/freshness-config";
import { sportMonks, sportMonksCached, type SportMonksList } from "@/lib/api-sportmonks.server";
import { mapSmFixture, type SMFixture } from "@/lib/sportmonks.mappers";
import { isQuotaExhausted } from "@/lib/system-status.server";
import { ensureMidnightRefresh } from "@/lib/midnight-refresh.server";
import { utcDateKey } from "@/services/dailyEngine";

const LIVE_SNAPSHOT_TTL = 30;
/** How many days ahead (beyond today) the live feed window covers. */
const FEED_WINDOW_DAYS = 4;

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
 * SportMonks-backed live feed. Uses `/fixtures/date/{date}` for the daily
 * schedule (which on this plan also includes in-play matches, so it doubles as
 * the live view). `/fixtures/live` requires undocumented params and 422s on the
 * current plan, so it's attempted and safely ignored when it fails. Team names
 * are parsed from the composite `name` field because the `localTeam`/`visitorTeam`
 * includes are plan-gated (404). Scores/`time` are only present when those
 * includes are granted, so the mapper falls back to 0 / no-minute defensively.
 */
export const getLiveFeed = createServerFn({ method: "GET" }).handler(async (): Promise<LiveFeed> => {
  // Any live-feed request keeps the UTC-midnight cache invalidation + warm
  // refresh timer armed, so the daily quota reset is handled automatically.
  ensureMidnightRefresh();
  const now = new Date();
  const from = utcDateKey(now);
  const to = utcDateKey(new Date(now.getTime() + FEED_WINDOW_DAYS * 86400000));
  return getLiveFeedSportMonks(from, to);
});
async function getLiveFeedSportMonks(from: string, to: string): Promise<LiveFeed> {
  const map = (rows: SMFixture[], prefix: string) => rows.map((r, i) => mapSmFixture(r, `${prefix}-${i}`));
  // One `/fixtures/between/{from}/{to}` call covers the whole rolling window
  // (today..today+4) and includes those days' in-play matches too, so it doubles
  // as the live view. Reuses the daily route's `include=league` approach so
  // league names stay populated and team names come from the `name` field.
  const window = await sportMonksCached<LiveFixture[] | null>(
    `fixtures-window:${from}:${to}`,
    TTL.FIXTURES,
    async () => {
      const json = await sportMonks<SportMonksList<SMFixture>>({
        path: `/fixtures/between/${from}/${to}`,
        include: ["league"],
      });
      const rows = json?.data ?? [];
      if (!rows.length) return null;
      return map(rows, `${from}-${to}`);
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
  if (!window?.length && !liveNow.length) return emptyFeed();
  // Dedupe by fixture id across the combined sources.
  const byId = new Map((window ?? []).map((f) => [f.id, f]));
  for (const live of liveNow) byId.set(live.id, live);
  return { date: from, source: "api-football", fixtures: [...byId.values()], quotaExhausted: isQuotaExhausted() };
}

/**
 * Historical transfer data for a player, cached for 6h so fresh moves show up
 * the same day. SportMonks has no granted transfers route on the current plan
 * (`/transfers/*` 404, `?include=transfers` not granted), so an honest empty
 * history is returned instead of the local mock so no fabricated moves show.
 */
export const getPlayerTransfers = createServerFn({ method: "GET" })
  .inputValidator((input: { playerId: string; apiPlayerId?: number }) => input)
  .handler(async ({ data }): Promise<TransferHistory> => {
    const fallback = mockTransfers(data.playerId);
    void fallback; // kept for when a SportMonks transfers route is granted

    const empty: TransferHistory = { playerId: data.playerId, source: "api-football", moves: [] };
    if (!data.apiPlayerId) return empty;
    // Route is plan-gated; keep the call warm for future plans so it starts
    // returning real data the moment the plan grants it.
    const json = await sportMonks<{
      data?: { transfers?: { data?: { date?: string; type?: string; team_name?: string }[] }[] } | null;
    }>({ path: `/transfers/player/${data.apiPlayerId}` });
    void json;
    return empty;
  });
