import { createServerFn } from "@tanstack/react-start";
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
  mapSmH2H,
  mapSmMatchDetailPage,
  mapSmMatchDetails,
  mapSmScheduleFixtures,
  mapSmStandings,
  type SMDetailFixture,
  type SMFixture,
  type SMH2HFixture,
  type SMScheduleStage,
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

/* ------------------------------------------------------------------ */
/* Match detail page (Step 2) product shapes                           */
/* ------------------------------------------------------------------ */

export type MatchDetailTeam = { id: number; name: string; logo?: string | undefined };

export type MatchDetailHeader = {
  league: { name: string; logo?: string | undefined };
  home: MatchDetailTeam & { score: number };
  away: MatchDetailTeam & { score: number };
  status: "scheduled" | "live" | "halftime" | "finished";
  minute: number;
  phase?: "first-half" | "halftime" | "second-half" | "extra-time" | "penalties" | undefined;
  addedTime?: number | undefined;
};

export type MatchDetailEvent = {
  minute: number;
  extraTime?: number | undefined;
  side: "home" | "away";
  type: "Goal" | "Card" | "Subst" | "Var" | string;
  player: string;
  detail?: string | undefined;
};

export type MatchDetailStat = { key: string; label: string; home: number; away: number };

export type MatchDetailLineupRow = {
  id: number;
  name: string;
  number: number;
  pos: string;
  grid?: string | undefined;
  photo?: string | undefined;
};

export type MatchDetailLineup = {
  teamId: number;
  teamName: string;
  formation: string;
  startXI: MatchDetailLineupRow[];
  substitutes: MatchDetailLineupRow[];
};

export type MatchDetailPage = {
  fixtureId: number;
  source: "api-football" | "mock";
  header: MatchDetailHeader;
  events: MatchDetailEvent[];
  stats: MatchDetailStat[];
  lineups: MatchDetailLineup[];
};

export type H2HRecord = {
  fixtureId: number;
  date: string;
  home: string;
  away: string;
  homeScore?: number | undefined;
  awayScore?: number | undefined;
  result: string;
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
  /** ISO 8601 kickoff (UTC) — used to show start times for upcoming matches. */
  kickoff?: string | undefined;
  league: { id: number; name: string; logo: string };
  home: { id: number; name: string; logo: string; score?: number | undefined };
  away: { id: number; name: string; logo: string; score?: number | undefined };
  status: "scheduled" | "live" | "halftime" | "finished";
  minute?: number | undefined;
  elapsed?: number | undefined;
  source?: "api-football" | "mock" | undefined;
};

function leagueIdToName(id: number): string {
  // SportMonks league ids (NOT the legacy API-Football ids — SportMonks is the
  // sole provider now and uses its own numeric ids).
  const map: Record<number, string> = {
    8: "Premier League",
    564: "La Liga",
    82: "Bundesliga",
    384: "Serie A",
    301: "Ligue 1",
    600: "Süper Lig",
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

    // Path-based SportMonks v3 standings call (the current plan rejects
    // `filter[...]` params with HTTP 400, so we use the season id in the path):
    //   GET /standings/seasons/{season_id}?include=participant;form;details
    // When the season can't be resolved, or the upstream returns no rows, we
    // serve persisted standings if present, otherwise an honest EMPTY table —
    // never fabricated teams/points.
    const smSeason = await resolveSeasonId(data.leagueId);
    if (smSeason == null) {
      const stored = await readStandingsDb(data.leagueId, season, leagueName);
      return stored ?? emptyStandings(data.leagueId, season, leagueName);
    }
    const result = await sportMonksCached<Standings | null>(
      `standings:${data.leagueId}:${smSeason}`,
      TTL.STANDINGS,
      async () => {
        const json = await sportMonks<SportMonksList<SMStanding>>({
          path: `/standings/seasons/${smSeason}`,
          include: ["participant", "form", "details"],
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
        return mapSmMatchDetails(data.fixtureId, f);
      },
      fallback,
    );
  });

/** Honest empty match-detail-page payload — shown instead of fabricated data when
 * the upstream provider returns no usable fixture. Never invents scores/stats. */
function emptyMatchDetailPage(fixtureId: number): MatchDetailPage {
  return {
    fixtureId,
    source: "api-football",
    header: {
      league: { name: "—" },
      home: { id: 0, name: "—", score: 0 },
      away: { id: 0, name: "—", score: 0 },
      status: "scheduled",
      minute: 0,
    },
    events: [],
    stats: [],
    lineups: [],
  };
}

/**
 * Match-detail data for the Step-2 page: header (teams/scores/status/minute),
 * events, statistics and lineups — all from the single detailed fixture call
 * `GET /fixtures/{id}?include=participants;scores;periods;events;lineups;lineups.player;statistics.type`.
 * (`league` is also included so the header shows the real competition; logo
 * stays undefined when the include is unavailable.) Empty/error returns an
 * honest empty page — never fabricated.
 */
export const getMatchDetailPage = createServerFn({ method: "GET" })
  .inputValidator((input: { fixtureId: number }) => input)
  .handler(async ({ data }): Promise<MatchDetailPage> => {
    return sportMonksCached<MatchDetailPage>(
      `match-detail-page:${data.fixtureId}`,
      TTL.LIVE,
      async () => {
        const json = await sportMonks<SportMonksEnvelope<SMDetailFixture>>({
          path: `/fixtures/${data.fixtureId}`,
          include: [
            "participants",
            "scores",
            "periods",
            "events",
            "lineups",
            "lineups.player",
            "statistics.type",
            "league",
          ],
        });
        const f = json?.data;
        if (!f) return null;
        return mapSmMatchDetailPage(data.fixtureId, f);
      },
      emptyMatchDetailPage(data.fixtureId),
    );
  });

/**
 * Head-to-head history between two teams, from
 * `GET /fixtures/head-to-head/{home}/{away}?include=scores;participants`.
 * Returns an honest empty list when none — never fabricated.
 */
export const getH2H = createServerFn({ method: "GET" })
  .inputValidator((input: { homeTeamId: number; awayTeamId: number }) => input)
  .handler(async ({ data }): Promise<H2HRecord[]> => {
    return sportMonksCached<H2HRecord[]>(
      `h2h:${data.homeTeamId}:${data.awayTeamId}`,
      TTL.LIVE,
      async () => {
        const json = await sportMonks<{ data: SMH2HFixture[] }>({
          path: `/fixtures/head-to-head/${data.homeTeamId}/${data.awayTeamId}`,
          include: ["scores", "participants"],
        });
        const rows = json?.data ?? [];
        if (!rows.length) return null;
        return rows.map(mapSmH2H);
      },
      [],
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

    // Path-based SportMonks v3 schedules call:
    //   GET /schedules/seasons/{season_id}
    // The response is stages → rounds → fixtures, each with `participants` and
    // `scores` (CURRENT rows). When the season can't be resolved, or the upstream
    // returns no fixtures, we return an honest empty list — never fabricated.
    const smSeason = await resolveSeasonId(data.leagueId);
    if (smSeason == null) return [];
    return sportMonksCached<Fixture[]>(
      `fixtures-league:${data.leagueId}:${smSeason}`,
      TTL.FIXTURES,
      async () => {
        const json = await sportMonks<{ data: SMScheduleStage[] }>({
          path: `/schedules/seasons/${smSeason}`,
        });
        const stages = json?.data ?? [];
        if (!stages.length) return null;
        const fixtures = mapSmScheduleFixtures(
          stages,
          data.leagueId,
          leagueIdToName(data.leagueId),
        );
        return fixtures.length ? fixtures : null;
      },
      [],
    );
  });
