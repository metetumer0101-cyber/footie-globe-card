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

/** A single highlight (goal / card) surfaced on the in-play live page. */
export type LiveHighlight = {
  minute: number;
  kind: "goal" | "penalty" | "red-card" | "yellow-card";
  side: "home" | "away";
  player: string;
  detail?: string | undefined;
};

export type LiveTeamSide = {
  name: string;
  badge: string;
  score: number;
  logo?: string | undefined;
  /** Provider team id — used for favorites matching (in-play feed only). */
  id?: number | undefined;
};

export type LiveFixture = {
  id: string;
  league: string;
  home: LiveTeamSide;
  away: LiveTeamSide;
  status: "scheduled" | "live" | "halftime" | "finished";
  /** Match minute for live games, kickoff HH:mm (UTC) for scheduled ones. */
  minute: number;
  kickoff: string;
  /**
   * ISO kickoff date (YYYY-MM-DD, UTC). Set for real (SportMonks) fixtures so
   * multi-day feeds can show which day an upcoming match is on; undefined for
   * the offline mock feed.
   */
  date?: string | undefined;
  /** Provider league id (in-play feed only). */
  leagueId?: number | undefined;
  /** Provider league crest (in-play feed only). */
  leagueLogo?: string | undefined;
  /** Fine-grained in-play phase derived from the current period (in-play feed). */
  phase?: "first-half" | "halftime" | "second-half" | "extra-time" | "penalties" | undefined;
  /** Stoppage/added time of the current period, when provided (in-play feed). */
  addedTime?: number | undefined;
  /** In-play highlights (goals / cards) derived from the events include (in-play feed). */
  highlights?: LiveHighlight[] | undefined;
  performers: LivePlayerLine[];
};

export type LiveFeed = {
  date: string;
  source: "api-football" | "mock";
  fixtures: LiveFixture[];
  /**
   * True when the upstream provider reported the daily quota exhausted during
   * the fetch that produced this feed. Carried with the data so consumers can
   * render an honest empty state from the same payload (no cross-query race).
   */
  quotaExhausted?: boolean;
};

/** Normalize a league name for ranking & grouping (lowercase, accent-free, collapsed spaces). */
export function normalizeLeague(league: string): string {
  return league
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .replace(/\s+/g, " ");
}

/** Grouping key — normalized name so "Süper Lig" and "Super Lig" share a league group. */
export function leagueGroupKey(league: string): string {
  return normalizeLeague(league);
}

/**
 * Competitions ordered by worldwide popularity for the Live tab's league-group
 * headings. Expected top order: UEFA Champions League → Premier League →
 * La Liga → Serie A → Bundesliga → Ligue 1 → Süper Lig → remaining majors →
 * then everything else (ranked last). Entries are normalized (lowercase,
 * accent-free) to match `leagueRank`'s substring matching.
 */
const MAJOR_LEAGUES = [
  "champions league",
  "premier league",
  "la liga",
  "serie a",
  "bundesliga",
  "ligue 1",
  "super lig",
  "europa league",
  "conference league",
  "eredivisie",
  "primeira liga",
  "championship",
  "mls",
  "major league soccer",
  "1. lig",
  "tff",
  "fa cup",
  "copa",
  "dfb",
  "belgian pro",
  "pro league",
  "scottish premiership",
  "austrian bundesliga",
  "swiss super league",
  "super league",
];

/** Smaller rank = shown earlier. Leagues not in {@link MAJOR_LEAGUES} rank last. */
export function leagueRank(league: string): number {
  const l = normalizeLeague(league);
  const idx = MAJOR_LEAGUES.findIndex((m) => l.includes(m));
  return idx === -1 ? MAJOR_LEAGUES.length : idx;
}

/** A curated, globally popular competition. `patterns` are normalized
 * (lowercase, accent-free) substrings matched against a fixture's league name;
 * first match wins, so order the list by specificity. */
export type CuratedLeague = {
  /** Stable, URL/i18n safe key. */
  id: string;
  /** Canonical display name (a proper noun — shown as-is across locales). */
  name: string;
  patterns: string[];
};

/**
 * The curated "29 lig" set surfaced on the Live page. Contains the well-known
 * worldwide leagues (the former `MAJOR_LEAGUES` ranking cores plus more) so the
 * filter exposes them explicitly while the full daily feed stays available.
 */
export const CURATED_LEAGUES: CuratedLeague[] = [
  { id: "uefa-champions-league", name: "UEFA Champions League", patterns: ["champions league"] },
  { id: "uefa-europa-league", name: "UEFA Europa League", patterns: ["europa league"] },
  { id: "uefa-conference-league", name: "UEFA Conference League", patterns: ["conference league"] },
  { id: "uefa-super-cup", name: "UEFA Super Cup", patterns: ["super cup"] },
  { id: "premier-league", name: "Premier League", patterns: ["premier league"] },
  { id: "efl-championship", name: "EFL Championship", patterns: ["championship"] },
  { id: "fa-cup", name: "FA Cup", patterns: ["fa cup"] },
  { id: "efl-cup", name: "EFL Cup", patterns: ["efl cup", "carabao", "league cup"] },
  { id: "la-liga", name: "La Liga", patterns: ["la liga", "laliga"] },
  { id: "copa-del-rey", name: "Copa del Rey", patterns: ["copa del rey"] },
  { id: "serie-a", name: "Serie A", patterns: ["serie a", "serie a tim"] },
  { id: "coppa-italia", name: "Coppa Italia", patterns: ["coppa italia"] },
  { id: "bundesliga", name: "Bundesliga", patterns: ["bundesliga"] },
  { id: "dfb-pokal", name: "DFB-Pokal", patterns: ["dfb pokal", "dfb-pokal"] },
  { id: "ligue-1", name: "Ligue 1", patterns: ["ligue 1"] },
  { id: "coupe-de-france", name: "Coupe de France", patterns: ["coupe de france"] },
  { id: "super-lig", name: "Süper Lig", patterns: ["super lig", "superlig", "turkish super"] },
  { id: "eredivisie", name: "Eredivisie", patterns: ["eredivisie"] },
  { id: "primeira-liga", name: "Primeira Liga", patterns: ["primeira liga", "liga portugal", "liga betclic"] },
  { id: "mls", name: "MLS", patterns: ["mls", "major league soccer"] },
  { id: "liga-mx", name: "Liga MX", patterns: ["liga mx"] },
  { id: "argentine-primera", name: "Argentine Primera División", patterns: ["liga profesional", "argentine primera", "primera division"] },
  { id: "brazil-serie-a", name: "Brazilian Série A", patterns: ["campeonato brasileiro", "brasileirao", "serie a brazil", "brazil serie", "brasil serie"] },
  { id: "scottish-premiership", name: "Scottish Premiership", patterns: ["scottish premiership", "scottish premier", "premiership"] },
  { id: "belgian-pro-league", name: "Belgian Pro League", patterns: ["pro league", "jupiler", "belgian first"] },
  { id: "austrian-bundesliga", name: "Austrian Bundesliga", patterns: ["austrian", "adelholzerner"] },
  { id: "swiss-super-league", name: "Swiss Super League", patterns: ["swiss", "suisse", "super league"] },
  { id: "greek-super-league", name: "Greek Super League", patterns: ["greek super", "greece super", "hellenic"] },
  { id: "saudi-pro-league", name: "Saudi Pro League", patterns: ["saudi", "roshn", "saudi pro"] },
];

/** Find the curated competition a fixture's league name belongs to, if any.
 * First matching pattern wins; `undefined` means "not in the curated 29". */
export function matchCuratedLeague(league: string): CuratedLeague | undefined {
  const l = normalizeLeague(league);
  if (!l) return undefined;
  return CURATED_LEAGUES.find((cl) => cl.patterns.some((p) => l.includes(p)));
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

export type LeagueGroup = { league: string; key: string; fixtures: LiveFixture[] };

/**
 * Group fixtures under league headings, ordered by worldwide popularity
 * (`leagueRank`); within each league, in-play matches first, then upcoming by
 * kickoff, then finished. Feed it the already status-filtered list.
 * Pure client-side (uses the cached serverFn payload) — costs no API calls.
 */
export function groupFixturesByLeague(fixtures: LiveFixture[]): LeagueGroup[] {
  const byKey = new Map<string, LeagueGroup>();
  for (const f of fixtures) {
    const key = leagueGroupKey(f.league);
    const existing = byKey.get(key);
    if (existing) {
      existing.fixtures.push(f);
    } else {
      byKey.set(key, { league: f.league, key, fixtures: [f] });
    }
  }
  const groups = [...byKey.values()];
  groups.sort((a, b) => leagueRank(a.league) - leagueRank(b.league));
  for (const g of groups) g.fixtures = sortFixtures(g.fixtures);
  return groups;
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
