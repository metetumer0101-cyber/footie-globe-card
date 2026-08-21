import { createServerFn } from "@tanstack/react-start";
import { buildMockFeed, type LiveFeed, type LiveFixture } from "@/lib/live";

type ApiFootballFixture = {
  fixture?: { id?: number; status?: { short?: string; elapsed?: number | null }; date?: string };
  league?: { name?: string };
  teams?: { home?: { name?: string; logo?: string }; away?: { name?: string; logo?: string } };
  goals?: { home?: number | null; away?: number | null };
};

function mapStatus(short: string | undefined): LiveFixture["status"] {
  if (!short) return "scheduled";
  if (["1H", "2H", "ET", "P", "LIVE"].includes(short)) return "live";
  if (short === "HT") return "halftime";
  if (["FT", "AET", "PEN"].includes(short)) return "finished";
  return "scheduled";
}

/**
 * Secure server-side proxy for API-Football. The key never reaches the browser,
 * and any missing key / upstream failure falls back to the deterministic mock
 * feed so the UI keeps working offline.
 */
export const getLiveFeed = createServerFn({ method: "GET" }).handler(async (): Promise<LiveFeed> => {
  const apiKey = process.env["API_FOOTBALL_KEY"];
  const fallback = buildMockFeed();
  if (!apiKey) return fallback;

  try {
    const date = fallback.date;
    const res = await fetch(`https://v3.football.api-sports.io/fixtures?date=${date}`, {
      headers: { "x-apisports-key": apiKey },
    });
    if (!res.ok) return fallback;
    const json = (await res.json()) as { response?: ApiFootballFixture[] };
    const rows = (json.response ?? []).slice(0, 12);
    if (!rows.length) return fallback;

    const fixtures: LiveFixture[] = rows.map((r, i) => ({
      id: String(r.fixture?.id ?? `${date}-${i}`),
      league: r.league?.name ?? "—",
      home: { name: r.teams?.home?.name ?? "Home", badge: "⚽", score: r.goals?.home ?? 0 },
      away: { name: r.teams?.away?.name ?? "Away", badge: "⚽", score: r.goals?.away ?? 0 },
      status: mapStatus(r.fixture?.status?.short),
      minute: r.fixture?.status?.elapsed ?? 0,
      kickoff: (r.fixture?.date ?? "").slice(11, 16),
      performers: [],
    }));

    return { date, source: "api-football", fixtures };
  } catch (error) {
    console.error("[live] API-Football proxy failed", error);
    return fallback;
  }
});
