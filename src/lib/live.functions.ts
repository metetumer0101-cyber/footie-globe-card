import { createServerFn } from "@tanstack/react-start";
import { buildMockFeed, mockTransfers, type LiveFeed, type LiveFixture, type TransferHistory } from "@/lib/live";
import { cached } from "@/lib/api-cache.server";

type ApiFootballFixture = {
  fixture?: { id?: number; status?: { short?: string; elapsed?: number | null }; date?: string };
  league?: { name?: string };
  teams?: { home?: { id?: number; name?: string; logo?: string }; away?: { id?: number; name?: string; logo?: string } };
  goals?: { home?: number | null; away?: number | null };
};

const API_BASE = "https://v3.football.api-sports.io";

function mapStatus(short: string | undefined): LiveFixture["status"] {
  if (!short) return "scheduled";
  if (["1H", "2H", "ET", "P", "LIVE"].includes(short)) return "live";
  if (short === "HT") return "halftime";
  if (["FT", "AET", "PEN"].includes(short)) return "finished";
  return "scheduled";
}

async function apiFootball<T>(path: string, apiKey: string): Promise<T | null> {
  const res = await fetch(`${API_BASE}${path}`, { headers: { "x-apisports-key": apiKey } });
  if (!res.ok) {
    console.error(`[live] API-Football ${path} -> ${res.status}`);
    return null;
  }
  return (await res.json()) as T;
}

/**
 * Secure server-side proxy for API-Football.
 *
 * - The API key never reaches the browser.
 * - Successful responses are cached in Supabase for 60s (live windows) so rate
 *   limits and costs stay low while scores stay fresh.
 * - Any missing key, rate limit or upstream failure falls back to the rich
 *   deterministic local mock feed so the UI keeps working.
 */
export const getLiveFeed = createServerFn({ method: "GET" }).handler(async (): Promise<LiveFeed> => {
  const apiKey = process.env["API_FOOTBALL_KEY"];
  const fallback = buildMockFeed();
  if (!apiKey) return fallback;

  return cached<LiveFeed>(
    `live-feed:${fallback.date}`,
    60,
    async () => {
      const json = await apiFootball<{ response?: ApiFootballFixture[] }>(
        `/fixtures?date=${fallback.date}`,
        apiKey,
      );
      const rows = json?.response ?? [];
      if (!rows.length) return null;

      const fixtures: LiveFixture[] = rows.map((r, i) => ({
        id: String(r.fixture?.id ?? `${fallback.date}-${i}`),
        league: r.league?.name ?? "—",
        home: {
          name: r.teams?.home?.name ?? "Home",
          badge: "⚽",
          score: r.goals?.home ?? 0,
          logo: r.teams?.home?.logo,
        },
        away: {
          name: r.teams?.away?.name ?? "Away",
          badge: "⚽",
          score: r.goals?.away ?? 0,
          logo: r.teams?.away?.logo,
        },
        status: mapStatus(r.fixture?.status?.short),
        minute: r.fixture?.status?.elapsed ?? 0,
        kickoff: (r.fixture?.date ?? "").slice(11, 16),
        performers: [],
      }));

      return { date: fallback.date, source: "api-football", fixtures } satisfies LiveFeed;
    },
    fallback,
  );
});

/**
 * Historical transfer data for a player, cached for 24h (it barely changes).
 * Falls back to the local mock transfer history used by the Transfer Path game.
 */
export const getPlayerTransfers = createServerFn({ method: "GET" })
  .inputValidator((input: { playerId: string; apiPlayerId?: number }) => input)
  .handler(async ({ data }): Promise<TransferHistory> => {
    const fallback = mockTransfers(data.playerId);
    const apiKey = process.env["API_FOOTBALL_KEY"];
    if (!apiKey || !data.apiPlayerId) return fallback;

    return cached<TransferHistory>(
      `transfers:${data.apiPlayerId}`,
      86_400,
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
