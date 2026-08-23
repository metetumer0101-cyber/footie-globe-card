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
import { utcDateKey } from "@/services/dailyEngine";

const LIVE_SNAPSHOT_TTL = 30;

/**
 * A feed with no fixtures — used as the honest "no live data" state instead of
 * a fabricated local mock. Consumers (e.g. the home page) treat an empty
 * fixtures list as "no real live data to show" and never invent scores.
 */
function emptyFeed(): LiveFeed {
  return { date: utcDateKey(new Date()), source: "api-football", fixtures: [] };
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
export const getLiveFeed = createServerFn({ method: "GET" }).handler(async (): Promise<LiveFeed> => {
  const apiKey = apiFootballKey();
  if (!apiKey) return emptyFeed();

  const date = utcDateKey(new Date());
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

  return { date, source: "api-football", fixtures: [...byId.values()] };
});

/**
 * Historical transfer data for a player, cached for 6h so fresh moves show up
 * the same day. Falls back to the local mock transfer history.
 */
export const getPlayerTransfers = createServerFn({ method: "GET" })
  .inputValidator((input: { playerId: string; apiPlayerId?: number }) => input)
  .handler(async ({ data }): Promise<TransferHistory> => {
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
