import { createServerFn } from "@tanstack/react-start";
import {
  buildMockFeed,
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

const LIVE_SNAPSHOT_TTL = 30;

/**
 * Secure server-side proxy for API-Football.
 *
 * Two cached layers, merged:
 *  - Daily schedule (`/fixtures?date=…`, 5 min cache) — every match today,
 *    scheduled or finished.
 *  - In-play snapshot (`/fixtures?live=all`, 30 s cache) — covers matches in
 *    leagues outside the daily window and refreshes live scores fast.
 *
 * Any missing key, rate limit or upstream failure falls back to the rich
 * deterministic local mock feed so the UI keeps working.
 */
export const getLiveFeed = createServerFn({ method: "GET" }).handler(async (): Promise<LiveFeed> => {
  const fallback = buildMockFeed();
  const apiKey = apiFootballKey();
  if (!apiKey) return fallback;

  const daily = await cached<LiveFixture[] | null>(
    `fixtures-day:${fallback.date}`,
    TTL.FIXTURES,
    async () => {
      const json = await apiFootball<{ response?: ApiFootballFixture[] }>(
        `/fixtures?date=${fallback.date}`,
        apiKey,
      );
      const rows = json?.response ?? [];
      if (!rows.length) return null;
      return rows.map((r, i) => mapFixtureRow(r, `${fallback.date}-${i}`));
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

  if (!daily?.length && !liveNow.length) return fallback;

  // Live snapshot wins over the (older) daily schedule row for the same match.
  const byId = new Map((daily ?? []).map((f) => [f.id, f]));
  for (const live of liveNow) byId.set(live.id, live);

  return { date: fallback.date, source: "api-football", fixtures: [...byId.values()] };
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
