import { createServerFn } from "@tanstack/react-start";
import { cached } from "@/lib/api-cache.server";
import { TTL } from "@/lib/freshness-config";
import {
  currentSeason,
  resolveSeasonId,
  sportMonks,
  sportMonksCached,
  type SportMonksEnvelope,
  type SportMonksList,
} from "@/lib/api-sportmonks.server";
import {
  mapSmFixtureBrief,
  mapSmMatchDetails,
  mapSmStandings,
  type SMFixture,
  type SMStanding,
} from "@/lib/sportmonks.mappers";
import { persistStandings, readStandingsDb } from "@/lib/football-data.server";

export type StandingRow = {
  rank: number;
  team: { id: number; name: string; logo: string };
  points: number;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDiff: number;
  form: string;
};

export type Standings = {
  leagueId: number;
  season: number;
  leagueName: string;
  logo: string;
  rows: StandingRow[];
  source: "api-football" | "mock";
};

export type MatchEvent = {
  elapsed: number;
  extraTime?: number | undefined;
  team: { id: number; name: string };
  player: { id: number; name: string };
  assist?: { id?: number | undefined; name?: string | undefined } | undefined;
  type: "Goal" | "Card" | "Subst" | "Var" | string;
  detail: string;
  comments?: string | undefined;
};

export type MatchStat = {
  type: string;
  home: string;
  away: string;
};

export type LineupPlayer = {
  id: number;
  name: string;
  number: number;
  pos: string;
  grid?: string | undefined;
};

export type MatchLineup = {
  team: { id: number; name: string; logo: string };
  formation: string;
  coach: string;
  startXI: LineupPlayer[];
  substitutes: LineupPlayer[];
};

export type MatchDetails = {
  fixtureId: number;
  source: "api-football" | "mock";
  events: MatchEvent[];
  stats: MatchStat[];
  lineups: MatchLineup[];
  /** Finished matches never change — cached/persisted permanently. */
  finished?: boolean;
};

export type Injury = {
  player: { id: number; name: string; photo?: string | undefined };
  team: { id: number; name: string };
  fixture?: { id: number; date?: string | undefined } | undefined;
  type?: string | undefined;
  reason?: string | undefined;
  status?: string | undefined;
};

export type Fixture = {
  id: number;
  date: string;
  league: { id: number; name: string; logo: string };
  home: { id: number; name: string; logo: string; score?: number | undefined };
  away: { id: number; name: string; logo: string; score?: number | undefined };
  status: "scheduled" | "live" | "halftime" | "finished";
  minute?: number | undefined;
  elapsed?: number | undefined;
  source?: "api-football" | "mock" | undefined;
};

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function leagueIdToName(id: number): string {
  const map: Record<number, string> = {
    39: "Premier League",
    140: "La Liga",
    78: "Bundesliga",
    135: "Serie A",
    61: "Ligue 1",
    203: "Süper Lig",
    2: "UEFA Champions League",
    3: "UEFA Europa League",
  };
  return map[id] ?? "Competition";
}

/** Honest empty table — shown instead of fabricated standings when the upstream
 * provider returns no data. Never invents teams or scores. */
function emptyStandings(leagueId: number, season: number, leagueName: string): Standings {
  return { leagueId, season, leagueName, logo: "", rows: [], source: "api-football" };
}

export const getStandings = createServerFn({ method: "GET" })
  .inputValidator((input: { leagueId: number; season?: number }) => input)
  .handler(async ({ data }): Promise<Standings> => {
    const season = data.season ?? currentSeason();
    const leagueName = leagueIdToName(data.leagueId);

    // Documented SportMonks v3 call:
    //   `/standings?filter[league_id]=x&filter[season_id]=y&include=participant;form;league`
    // (filter/format validated against the live API). The current trial plan
    // rejects the filter param with HTTP 400 "Filters should be passed as a
    // string" / 5010 (plan-gating, not a format bug) so the loader returns null
    // and we serve real persisted standings if present, otherwise an honest
    // EMPTY table — never fabricated teams/points.
    const smSeason = await resolveSeasonId(data.leagueId);
    const result = await sportMonksCached<Standings | null>(
      `standings:${data.leagueId}:${season}`,
      TTL.STANDINGS,
      async () => {
        const filters: Record<string, number> = { league_id: data.leagueId };
        if (smSeason != null) filters["season_id"] = smSeason;
        const json = await sportMonks<SportMonksList<SMStanding>>({
          path: "/standings",
          filters,
          include: ["participant", "form", "league"],
        });
        const rows = json?.data ?? [];
        if (!rows.length) return null;
        const mapped = mapSmStandings(rows, { id: data.leagueId }, leagueName, season);
        void persistStandings(mapped);
        return mapped;
      },
      null,
    );
    if (result) return result;
    const stored = await readStandingsDb(data.leagueId, season, leagueName);
    return stored ?? emptyStandings(data.leagueId, season, leagueName);
  });

/** Honest empty match-detail payload — shown instead of fabricated stats when
 * the upstream provider returns no data. Never invents scores or statistics. */
function emptyMatchDetails(fixtureId: number): MatchDetails {
  return { fixtureId, source: "api-football", events: [], stats: [], lineups: [] };
}

export const getMatchDetails = createServerFn({ method: "GET" })
  .inputValidator((input: { fixtureId: number }) => input)
  .handler(async ({ data }): Promise<MatchDetails> => {
    const fallback = emptyMatchDetails(data.fixtureId);

    // Single call: `/fixtures/{id}?include=league;events;statistics;lineups`.
    // Confirmed working includes on this plan: events, statistics, lineups.
    // (`localTeam`/`visitorTeam` 404 and are deliberately omitted — the teams
    // aren't recognised by the product types and the call drops to 404.)
    return sportMonksCached<MatchDetails>(
      `match-detail:${data.fixtureId}`,
      TTL.LIVE,
      async () => {
        const json = await sportMonks<SportMonksEnvelope<SMFixture>>({
          path: `/fixtures/${data.fixtureId}`,
          include: ["league", "events", "statistics", "lineups"],
        });
        const f = json?.data;
        if (!f) return null;
        return mapSmMatchDetails(data.fixtureId, { ...f, state_id: f.state_id });
      },
      fallback,
    );
  });

export const getInjuries = createServerFn({ method: "GET" })
  .inputValidator((input: { teamId: number; season?: number }) => input)
  .handler(async ({ data }): Promise<Injury[]> => {
    // SportMonks v3 has no injuries route granted on the current plan
    // (`/injuries/*` 404), and the legacy API-Football `/injuries` endpoint is no
    // longer reachable (client removed in Step 4). Return an honest empty list
    // rather than mocks.
    void data;
    return [];
  });

export const getFixturesByLeague = createServerFn({ method: "GET" })
  .inputValidator((input: { leagueId: number; season?: number; date?: string }) => input)
  .handler(async ({ data }): Promise<Fixture[]> => {
    const season = data.season ?? currentSeason();
    const date = data.date ?? today();

    // `/fixtures` filtering (`filter[league_id]`) returns "Filters should be
    // passed as a string" on the current plan, so instead we pull the date's
    // fixtures (which include the league object) and filter client-side. When no
    // fixtures exist we return an honest empty list — never fabricated fixtures.
    return sportMonksCached<Fixture[]>(
      `fixtures-league:${data.leagueId}:${season}:${date}`,
      TTL.FIXTURES,
      async () => {
        const json = await sportMonks<SportMonksList<SMFixture>>({
          path: `/fixtures/date/${date}`,
          include: ["league"],
        });
        const rows = (json?.data ?? []).filter((r) => r.league_id === data.leagueId);
        if (!rows.length) return null;
        return rows.map((r) => mapSmFixtureBrief(r, data.leagueId, date));
      },
      [],
    );
  });
