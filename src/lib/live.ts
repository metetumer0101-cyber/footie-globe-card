import { transferPaths } from "@/lib/games";
import { players, teams } from "@/data/football";
import { hashSeed, seededRandom, utcDateKey } from "@/services/dailyEngine";

export type LivePlayerLine = {
  playerId: string | null;
  name: string;
  team: string;
  rating: number;
  goals: number;
  assists: number;
};

export type LiveFixture = {
  id: string;
  league: string;
  home: { name: string; badge: string; score: number; logo?: string | undefined };
  away: { name: string; badge: string; score: number; logo?: string | undefined };
  status: "scheduled" | "live" | "halftime" | "finished";
  /** Match minute for live games, kickoff HH:mm (UTC) for scheduled ones. */
  minute: number;
  kickoff: string;
  performers: LivePlayerLine[];
};

export type LiveFeed = {
  date: string;
  source: "api-football" | "mock";
  fixtures: LiveFixture[];
};

/** Competitions users most often follow — surfaced first in lists. */
const MAJOR_LEAGUES = [
  "süper lig", "super lig", "premier league", "la liga", "serie a", "bundesliga",
  "ligue 1", "champions league", "europa league", "conference league",
  "eredivisie", "primeira liga", "championship", "mls", "major league soccer",
  "1. lig", "tff", "fa cup", "copa", "dfb", "eredivisie", "belgian pro", "pro league",
  "scottish premiership", "austrian bundesliga", "swiss super league", "super league",
];

function leagueRank(league: string): number {
  const l = league.toLowerCase();
  const idx = MAJOR_LEAGUES.findIndex((m) => l.includes(m));
  return idx === -1 ? MAJOR_LEAGUES.length : idx;
}

const STATUS_ORDER: Record<LiveFixture["status"], number> = {
  live: 0,
  halftime: 0,
  scheduled: 1,
  finished: 2,
};

/**
 * User-focused ordering: in-play matches first, then upcoming (by kickoff),
 * then finished; major leagues always ahead of minor ones within a group.
 * `favLeague` (if set) outranks everything inside its status group.
 */
export function sortFixtures(fixtures: LiveFixture[], favLeague?: string): LiveFixture[] {
  return [...fixtures].sort((a, b) => {
    const so = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
    if (so !== 0) return so;
    if (favLeague) {
      const fav = Number(b.league === favLeague) - Number(a.league === favLeague);
      if (fav !== 0) return fav;
    }
    const lr = leagueRank(a.league) - leagueRank(b.league);
    if (lr !== 0) return lr;
    return a.kickoff.localeCompare(b.kickoff);
  });
}

/** Deterministic offline feed so the module works with no API key configured. */
export function buildMockFeed(now = new Date()): LiveFeed {
  const date = utcDateKey(now);
  const rnd = seededRandom(hashSeed(`live:${date}`));
  const pool = [...teams];
  const fixtures: LiveFixture[] = [];
  const minutesNow = now.getUTCHours() * 60 + now.getUTCMinutes();

  for (let i = 0; i < Math.min(5, Math.floor(pool.length / 2)); i++) {
    const home = pool.splice(Math.floor(rnd() * pool.length), 1)[0];
    const away = pool.splice(Math.floor(rnd() * pool.length), 1)[0];
    if (!home || !away) break;

    const kickoffMinutes = 12 * 60 + i * 105;
    const elapsed = minutesNow - kickoffMinutes;
    const status: LiveFixture["status"] =
      elapsed < 0 ? "scheduled" : elapsed > 100 ? "finished" : elapsed >= 45 && elapsed < 50 ? "halftime" : "live";
    const minute = status === "scheduled" ? 0 : Math.min(90, Math.max(1, elapsed));

    const homeScore = status === "scheduled" ? 0 : Math.floor(rnd() * 4);
    const awayScore = status === "scheduled" ? 0 : Math.floor(rnd() * 3);

    const performers: LivePlayerLine[] = [home, away].flatMap((team) => {
      const squad = players.filter((p) => p.club === team.club);
      const picks = (squad.length ? squad : [players[Math.floor(rnd() * players.length)]!]).slice(0, 2);
      return picks.map((p) => ({
        playerId: p.id,
        name: p.name,
        team: team.name,
        rating: Math.round((6 + rnd() * 3.5) * 10) / 10,
        goals: status === "scheduled" ? 0 : rnd() > 0.72 ? 1 : 0,
        assists: status === "scheduled" ? 0 : rnd() > 0.82 ? 1 : 0,
      }));
    });

    fixtures.push({
      id: `${date}-${home.id}-${away.id}`,
      league: home.league,
      home: { name: home.name, badge: home.clubBadge, score: homeScore },
      away: { name: away.name, badge: away.clubBadge, score: awayScore },
      status,
      minute,
      kickoff: `${String(Math.floor(kickoffMinutes / 60) % 24).padStart(2, "0")}:${String(kickoffMinutes % 60).padStart(2, "0")}`,
      performers,
    });
  }

  return { date, source: "mock", fixtures };
}

/* ---------------- API-Football fixture mapping ---------------- */

/** Raw API-Football fixture row (subset used by the proxy). */
export type ApiFootballFixture = {
  fixture?: { id?: number; status?: { short?: string; elapsed?: number | null }; date?: string };
  league?: { name?: string };
  teams?: {
    home?: { id?: number; name?: string; logo?: string };
    away?: { id?: number; name?: string; logo?: string };
  };
  goals?: { home?: number | null; away?: number | null };
};

export function mapFixtureStatus(short: string | undefined): LiveFixture["status"] {
  if (!short) return "scheduled";
  if (["1H", "2H", "ET", "P", "LIVE"].includes(short)) return "live";
  if (short === "HT") return "halftime";
  if (["FT", "AET", "PEN"].includes(short)) return "finished";
  return "scheduled";
}

/** Normalize one raw API-Football row into the app fixture shape. */
export function mapFixtureRow(row: ApiFootballFixture, fallbackId: string): LiveFixture {
  return {
    id: String(row.fixture?.id ?? fallbackId),
    league: row.league?.name ?? "—",
    home: {
      name: row.teams?.home?.name ?? "Home",
      badge: "⚽",
      score: row.goals?.home ?? 0,
      logo: row.teams?.home?.logo,
    },
    away: {
      name: row.teams?.away?.name ?? "Away",
      badge: "⚽",
      score: row.goals?.away ?? 0,
      logo: row.teams?.away?.logo,
    },
    status: mapFixtureStatus(row.fixture?.status?.short),
    minute: row.fixture?.status?.elapsed ?? 0,
    kickoff: (row.fixture?.date ?? "").slice(11, 16),
    performers: [],
  };
}

/* ---------------- Historical transfers ---------------- */

export type TransferMove = { date: string; from: string; to: string };

export type TransferHistory = {
  playerId: string;
  source: "api-football" | "mock";
  moves: TransferMove[];
};

/** Rich local fallback derived from the curated transfer-path dataset. */
export function mockTransfers(playerId: string): TransferHistory {
  const path = transferPaths.find((p) => p.playerId === playerId);
  const clubs = path?.clubs ?? [];
  const moves: TransferMove[] = clubs.slice(1).map((club, i) => ({
    date: "",
    from: clubs[i]!,
    to: club,
  }));
  return { playerId, source: "mock", moves };
}
