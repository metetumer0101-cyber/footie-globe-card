import { createServerFn } from "@tanstack/react-start";
import { cached, readCacheEntry } from "@/lib/api-cache.server";
import { TTL } from "@/lib/freshness-config";
import { players, teams } from "@/data/football";
import { apiFootball, apiFootballKey, currentSeason } from "@/lib/api-football.server";
import {
  isSportMonksEnabled,
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
import {
  persistInjuries,
  persistMatchDetails,
  persistStandings,
  readInjuriesDb,
  readMatchDetailsDb,
  readStandingsDb,
} from "@/lib/football-data.server";

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

function mockStandings(leagueId: number, season: number): Standings {
  const leagueName = leagueIdToName(leagueId);
  const known = teams.filter((t) => t.league.toLowerCase().includes(leagueName.toLowerCase()));
  const placeholders = [
    "United", "City", "Rovers", "Wanderers", "Athletic", "Olympic", "Sporting", "Nacional",
    "Dynamo", "Spartak", "Rangers", "Celtic", "Basel", "Roma", "Milan", "Lyon",
  ];
  const needed = Math.max(0, 10 - known.length);
  const padded = Array.from({ length: needed }, (_, i) => ({
    name: `${leagueName.split(" ")[0]} ${placeholders[i % placeholders.length]}`,
  }));
  const pool = [...known.map((t) => ({ name: t.name })), ...padded];
  const rows: StandingRow[] = pool
    .map((t, i) => ({
      rank: i + 1,
      team: { id: 1000 + i, name: t.name, logo: "" },
      points: Math.max(0, 60 - i * 8 + (i % 3) * 4),
      played: 20 + i,
      wins: Math.max(0, 12 - i),
      draws: 4 + (i % 3),
      losses: i + 2,
      goalsFor: Math.max(0, 50 - i * 4),
      goalsAgainst: 20 + i * 3,
      goalDiff: Math.max(0, 50 - i * 4) - (20 + i * 3),
      form: ["W", "W", "D", "L", "W"].slice(i % 2, 5 - (i % 2)).join("") || "WDWLW",
    }))
    .sort((a, b) => b.points - a.points || b.goalDiff - a.goalDiff);
  return {
    leagueId,
    season,
    leagueName,
    logo: "",
    rows,
    source: "mock",
  };
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

export const getStandings = createServerFn({ method: "GET" })
  .inputValidator((input: { leagueId: number; season?: number }) => input)
  .handler(async ({ data }): Promise<Standings> => {
    const season = data.season ?? currentSeason();
    const fallback = mockStandings(data.leagueId, season);

    if (isSportMonksEnabled()) {
      // `/standings?filter[league_id]&filter[season_id]&include=participant;form`
      // is the documented SportMonks v3 call. NOTE: the current plan returns
      // HTTP 400 "Filters should be passed as a string" (plan-gating) so this
      // loader returns null and the existing DB/mock fallback below serves the
      // table — kept wired for when standings filtering is granted.
      const fallbackName = fallback.leagueName;
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
          const mapped = mapSmStandings(rows, { id: data.leagueId }, fallbackName, season);
          void persistStandings(mapped);
          return mapped;
        },
        null,
      );
      if (result) return result;
      const stored = await readStandingsDb(data.leagueId, season, fallback.leagueName);
      return stored ?? fallback;
    }

    const apiKey = apiFootballKey();
    const result = !apiKey
      ? null
      : await cached<Standings | null>(
          `standings:${data.leagueId}:${season}`,
          TTL.STANDINGS,
      async () => {
        const json = await apiFootball<{
          response?: {
            league?: { id?: number; name?: string; logo?: string; season?: number };
            standings?: {
              rank?: number;
              team?: { id?: number; name?: string; logo?: string };
              all?: { played?: number; win?: number; draw?: number; lose?: number; goals?: { for?: number; against?: number } };
              points?: number;
              form?: string;
            }[][];
          }[];
        }>(`/standings?league=${data.leagueId}&season=${season}`, apiKey);
        const first = json?.response?.[0];
        const rows = (first?.standings?.[0] ?? []).map((r) => ({
          rank: r.rank ?? 0,
          team: {
            id: r.team?.id ?? 0,
            name: r.team?.name ?? "—",
            logo: r.team?.logo ?? "",
          },
          points: r.points ?? 0,
          played: r.all?.played ?? 0,
          wins: r.all?.win ?? 0,
          draws: r.all?.draw ?? 0,
          losses: r.all?.lose ?? 0,
          goalsFor: r.all?.goals?.for ?? 0,
          goalsAgainst: r.all?.goals?.against ?? 0,
          goalDiff: (r.all?.goals?.for ?? 0) - (r.all?.goals?.against ?? 0),
          form: r.form ?? "",
        }));
        if (!rows.length) return null;
        const standings: Standings = {
          leagueId: first?.league?.id ?? data.leagueId,
          season: first?.league?.season ?? season,
          leagueName: first?.league?.name ?? fallback.leagueName,
          logo: first?.league?.logo ?? "",
          rows,
          source: "api-football",
        };
        // Mirror into the standings table so the table survives cache expiry.
        void persistStandings(standings);
        return standings;
      },
      null,
    );

    if (result) return result;
    // Quota exhausted or upstream down — serve the last persisted table.
    const stored = await readStandingsDb(data.leagueId, season, fallback.leagueName);
    return stored ?? fallback;
  });

function mockMatchDetails(fixtureId: number): MatchDetails {
  return {
    fixtureId,
    source: "mock",
    events: [],
    stats: [
      { type: "Ball Possession", home: "50%", away: "50%" },
      { type: "Total Shots", home: "8", away: "7" },
      { type: "Shots on Goal", home: "3", away: "2" },
      { type: "Corner Kicks", home: "4", away: "3" },
      { type: "Fouls", home: "10", away: "11" },
    ],
    lineups: [],
  };
}

export const getMatchDetails = createServerFn({ method: "GET" })
  .inputValidator((input: { fixtureId: number }) => input)
  .handler(async ({ data }): Promise<MatchDetails> => {
    const fallback = mockMatchDetails(data.fixtureId);

    if (isSportMonksEnabled()) {
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
    }

    const apiKey = process.env["API_FOOTBALL_KEY"];
    if (!apiKey) return fallback;

    return cached<MatchDetails>(
      `match-detail:${data.fixtureId}`,
      TTL.LIVE,
      async () => {
        const [eventsJson, statsJson, lineupsJson] = await Promise.all([
          apiFootball<{ response?: { time?: { elapsed?: number; extra?: number }; team?: { id?: number; name?: string }; player?: { id?: number; name?: string }; assist?: { id?: number; name?: string }; type?: string; detail?: string; comments?: string }[] }>(`/fixtures/events?fixture=${data.fixtureId}`, apiKey),
          apiFootball<{ response?: { team?: { id?: number; name?: string }; statistics?: { type?: string; value?: string | number }[] }[] }>(`/fixtures/statistics?fixture=${data.fixtureId}`, apiKey),
          apiFootball<{
            response?: {
              team?: { id?: number; name?: string; logo?: string; colors?: unknown };
              formation?: string;
              coach?: { name?: string };
              startXI?: { player?: { id?: number; name?: string; number?: number; pos?: string; grid?: string } }[];
              substitutes?: { player?: { id?: number; name?: string; number?: number; pos?: string; grid?: string } }[];
            }[];
          }>(`/fixtures/lineups?fixture=${data.fixtureId}`, apiKey),
        ]);

        const events: MatchEvent[] = (eventsJson?.response ?? []).map((e) => ({
          elapsed: e.time?.elapsed ?? 0,
          extraTime: e.time?.extra,
          team: { id: e.team?.id ?? 0, name: e.team?.name ?? "—" },
          player: { id: e.player?.id ?? 0, name: e.player?.name ?? "—" },
          assist: e.assist?.id ? { id: e.assist.id, name: e.assist.name } : undefined,
          type: e.type ?? "",
          detail: e.detail ?? "",
          comments: e.comments,
        }));

        const stats: MatchStat[] = (statsJson?.response ?? [])
          .flatMap((s) => (s.statistics ?? []).map((st) => ({ type: st.type ?? "", value: st.value })))
          .reduce<MatchStat[]>((acc, cur, idx, arr) => {
            const half = Math.ceil(arr.length / 2);
            if (idx < half) {
              const away = arr[idx + half];
              acc.push({ type: cur.type, home: String(cur.value ?? ""), away: String(away?.value ?? "") });
            }
            return acc;
          }, []);

        const lineups: MatchLineup[] = (lineupsJson?.response ?? []).map((l) => ({
          team: { id: l.team?.id ?? 0, name: l.team?.name ?? "—", logo: l.team?.logo ?? "" },
          formation: l.formation ?? "—",
          coach: l.coach?.name ?? "—",
          startXI: (l.startXI ?? []).map((p) => ({
            id: p.player?.id ?? 0,
            name: p.player?.name ?? "—",
            number: p.player?.number ?? 0,
            pos: p.player?.pos ?? "—",
            grid: p.player?.grid,
          })),
          substitutes: (l.substitutes ?? []).map((p) => ({
            id: p.player?.id ?? 0,
            name: p.player?.name ?? "—",
            number: p.player?.number ?? 0,
            pos: p.player?.pos ?? "—",
            grid: p.player?.grid,
          })),
        }));

        return { fixtureId: data.fixtureId, source: "api-football", events, stats, lineups };
      },
      fallback,
    );
  });

function mockInjuries(teamId: number): Injury[] {
  const team = teams.find((t) => t.id.includes(String(teamId))) ?? teams[0];
  const squad = players.filter((p) => p.club === team?.club).slice(0, 2);
  return squad.map((p) => ({
    player: { id: 0, name: p.name, photo: "" },
    team: { id: teamId, name: team?.name ?? "—" },
    fixture: undefined,
    type: p.injuries ? "Injury" : undefined,
    reason: p.injuries ?? undefined,
    status: p.injuries ? "Out" : undefined,
  }));
}

export const getInjuries = createServerFn({ method: "GET" })
  .inputValidator((input: { teamId: number; season?: number }) => input)
  .handler(async ({ data }): Promise<Injury[]> => {
    if (isSportMonksEnabled()) {
      // SportMonks v3 has no injuries route granted on the current plan
      // (`/injuries/*` 404). Return an honest empty list rather than mocks.
      return [];
    }
    const apiKey = process.env["API_FOOTBALL_KEY"];
    const season = data.season ?? currentSeason();
    const fallback = mockInjuries(data.teamId);
    if (!apiKey) return fallback;

    return cached<Injury[]>(
      `injuries:${data.teamId}:${season}`,
      TTL.INJURIES,
      async () => {
        const json = await apiFootball<{
          response?: { player?: { id?: number; name?: string; photo?: string }; team?: { id?: number; name?: string }; fixture?: { id?: number; date?: string }; type?: string; reason?: string; status?: string }[];
        }>(`/injuries?team=${data.teamId}&season=${season}`, apiKey);
        const rows = json?.response ?? [];
        if (!rows.length) return null;
        return rows.map((r) => ({
          player: { id: r.player?.id ?? 0, name: r.player?.name ?? "—", photo: r.player?.photo },
          team: { id: r.team?.id ?? 0, name: r.team?.name ?? "—" },
          fixture: r.fixture?.id ? { id: r.fixture.id, date: r.fixture.date } : undefined,
          type: r.type,
          reason: r.reason,
          status: r.status,
        }));
      },
      fallback,
    );
  });

function mockFixtures(leagueId: number, date: string): Fixture[] {
  const leagueTeams = teams.filter((t) => t.league.toLowerCase().includes(leagueIdToName(leagueId).toLowerCase()));
  const pool = leagueTeams.length ? leagueTeams : teams.slice(0, 6);
  return pool.slice(0, Math.floor(pool.length / 2) * 2).reduce<Fixture[]>((acc, t, i, arr) => {
    if (i % 2 === 0 && arr[i + 1]) {
      acc.push({
        id: 900000 + i,
        date,
        league: { id: leagueId, name: leagueIdToName(leagueId), logo: "" },
        home: { id: 1000 + i, name: t.name, logo: "" },
        away: { id: 1000 + i + 1, name: arr[i + 1]!.name, logo: "" },
        status: "scheduled",
      });
    }
    return acc;
  }, []);
}

export const getFixturesByLeague = createServerFn({ method: "GET" })
  .inputValidator((input: { leagueId: number; season?: number; date?: string }) => input)
  .handler(async ({ data }): Promise<Fixture[]> => {
    const season = data.season ?? currentSeason();
    const date = data.date ?? today();
    const fallback = mockFixtures(data.leagueId, date);

    if (isSportMonksEnabled()) {
      // `/fixtures` filtering (`filter[league_id]`) returns "Filters should be
      // passed as a string" on the current plan, so instead we pull the date's
      // fixtures (which include the league object) and filter client-side.
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
        fallback,
      );
    }

    const apiKey = process.env["API_FOOTBALL_KEY"];
    if (!apiKey) return fallback;

    return cached<Fixture[]>(
      `fixtures-league:${data.leagueId}:${season}:${date}`,
      TTL.FIXTURES,
      async () => {
        const json = await apiFootball<{
          response?: {
            fixture?: { id?: number; date?: string; status?: { short?: string; elapsed?: number | null } };
            league?: { id?: number; name?: string; logo?: string };
            teams?: { home?: { id?: number; name?: string; logo?: string }; away?: { id?: number; name?: string; logo?: string } };
            goals?: { home?: number | null; away?: number | null };
          }[];
        }>(`/fixtures?league=${data.leagueId}&season=${season}&date=${date}`, apiKey);
        const rows = json?.response ?? [];
        if (!rows.length) return null;
        return rows.map((r) => {
          const short = r.fixture?.status?.short;
          const status: Fixture["status"] =
            ["1H", "2H", "ET", "P", "LIVE"].includes(short ?? "") ? "live" : short === "HT" ? "halftime" : ["FT", "AET", "PEN"].includes(short ?? "") ? "finished" : "scheduled";
          return {
            id: r.fixture?.id ?? 0,
            date: r.fixture?.date ?? date,
            league: { id: r.league?.id ?? data.leagueId, name: r.league?.name ?? "—", logo: r.league?.logo ?? "" },
            home: { id: r.teams?.home?.id ?? 0, name: r.teams?.home?.name ?? "—", logo: r.teams?.home?.logo ?? "", score: r.goals?.home ?? undefined },
            away: { id: r.teams?.away?.id ?? 0, name: r.teams?.away?.name ?? "—", logo: r.teams?.away?.logo ?? "", score: r.goals?.away ?? undefined },
            status,
            minute: r.fixture?.status?.elapsed ?? undefined,
            source: "api-football",
          };
        });
      },
      fallback,
    );
  });
