/**
 * SportMonks raw response -> existing product type mappers.
 *
 * Every function in this file converts a raw SportMonks v3 payload into one of
 * the app's *provider-agnostic* product types (`LiveFixture`, `StandingRow`,
 * `MatchDetails`, `WorldPlayer`, `PlayerCardData`, `TeamPageData`, ...). Because
 * the product types are provider-independent, the existing `*.server.ts` /
 * `*.functions.ts` signatures never need to change — only their internals, which
 * Step 2 wires to these mappers.
 *
 * ⚠️ SPORTMONKS FIELD SHAPE — READ ME
 * SportMonks v3 differs structurally from API-Football: payloads are `{ data }`,
 * relations arrive via `?include=...`, and field names differ (e.g.
 * `scores.localteam_score` vs API-Football's `goals.home`). The exact shape of
 * nested includes (lineups, statistics, event `type`/`detail`) varies by plan and
 * must be validated against a live response during Step 2 wiring. These mappers
 * are written defensively (optional chaining + sane fallbacks) and encode the
 * documented SportMonks conventions; any field that can't be confirmed is left
 * with a fallback and flagged with `STMAP:` so it can be tightened during wiring.
 */

import type { LiveFixture } from "@/lib/live";
import type {
  Injury,
  LineupPlayer,
  MatchDetails,
  MatchEvent,
  MatchLineup,
  MatchStat,
  StandingRow,
  Standings,
} from "@/lib/football-data.functions";
import type { WorldPlayer } from "@/lib/player-search.functions";
import type { TeamPageData, TeamSearchHit } from "@/lib/entity.server";
import type { PlayerCardData, Tier } from "@/data/football";

/* ------------------------------------------------------------------ */
/* Raw SportMonks shapes (subset used by the app)                      */
/* ------------------------------------------------------------------ */

export type SMTeam = {
  id?: number;
  name?: string;
  short_code?: string;
  image_path?: string;
  country_id?: number;
};

export type SMLeague = { id?: number; name?: string; image_path?: string };

export type SMPlayer = {
  id?: number;
  name?: string;
  firstname?: string;
  lastname?: string;
  image_path?: string;
  date_of_birth?: string;
  height?: number | string | null;
  weight?: number | string | null;
  position_id?: number;
  nationality?: string;
  country?: { id?: number; name?: string } | null;
};

export type SMFixture = {
  id?: number;
  league_id?: number;
  season_id?: number;
  state_id?: number;
  localteam_id?: number;
  visitorteam_id?: number;
  starting_at?: string;
  time?: { minute?: number | null; added_time?: number | null; status?: string | null };
  scores?: {
    localteam_score?: number | null;
    visitorteam_score?: number | null;
    ht_score?: string | null;
    ft_score?: string | null;
  };
  localTeam?: SMTeam | null;
  visitorTeam?: SMTeam | null;
  league?: SMLeague | null;
  /** Embedded when `include=events`. */
  events?: SMEvent[];
  /** Embedded when `include=statistics`. */
  statistics?: SMStatistic[];
  /** Embedded when `include=lineups`. */
  lineups?: SMLineup[];
};

export type SMEvent = {
  id?: number;
  minute?: number;
  extra_minute?: number;
  participant_id?: number;
  player_id?: number;
  player_name?: string;
  related_player_id?: number;
  related_player_name?: string;
  type?: string;
  detail?: string;
  reason?: string;
};

export type SMStatistic = {
  id?: number;
  type?: string;
  name?: string;
  value?: string | number | null;
  type_id?: number;
  team_id?: number;
  participant_id?: number;
  player_id?: number;
  /** SportMonks groups per-team stat rows; each entry may hold a `stats` list. */
  stats?: { type?: { name?: string }; type_id?: number; value?: string | number | null; name?: string }[];
  data?: { type?: { name?: string }; type_id?: number; value?: string | number | null; name?: string }[];
};

export type SMLineup = {
  id?: number;
  player_id?: number;
  player_name?: string;
  team_id?: number;
  participant_id?: number;
  position_id?: number;
  formation_field?: string;
  number?: number;
  type?: string;
  player?: SMPlayer | null;
  lineup?: {
    formation?: string;
    formation_position?: string;
    [k: string]: unknown;
  } | null;
};

export type SMStanding = {
  id?: number;
  position?: number;
  points?: number;
  participant_id?: number;
  team_id?: number;
  played?: number;
  won?: number;
  drawn?: number;
  lost?: number;
  goals?: { scored?: number; against?: number; difference?: number };
  details?: {
    played?: number;
    wins?: number;
    draws?: number;
    losses?: number;
    scores?: { for?: number; against?: number };
  };
  form?: string | string[];
  participant?: SMTeam | null;
  team?: SMTeam | null;
};

export type SMInjury = {
  id?: number;
  player_id?: number;
  player_name?: string;
  player?: SMPlayer | null;
  team_id?: number;
  team?: SMTeam | null;
  fixture_id?: number;
  starting_at?: string;
  type?: string;
  reason?: string;
  status?: string;
};

/* ------------------------------------------------------------------ */
/* Fixtures                                                            */
/* ------------------------------------------------------------------ */

/** Map a SportMonks fixture state id to the app's coarse status. */
export function mapSmFixtureStatus(f: {
  state_id?: number;
  time?: { minute?: number | null; status?: string | null };
}): LiveFixture["status"] {
  const state = f.state_id;
  // Documented SportMonks states: 1 scheduled, 5 live, 6 finished, 7 awarded,
  // 55 halftime (halftime can also be a text status in some plans).
  if (state === 6 || state === 7) return "finished";
  if (typeof f.time?.status === "string") {
    const s = f.time.status.toLowerCase();
    if (["ft", "aet", "pen", "et", "finished"].includes(s)) return "finished";
    if (s === "ht" || s === "halftime" || s === "half") return "halftime";
    if (["1h", "2h", "live", "inplay", "et"].includes(s)) return "live";
  }
  if (state === 5 || (state != null && state > 1 && state !== 55 && f.time?.minute != null && f.time.minute > 0)) {
    return "live";
  }
  if (state === 55 || (f.time?.minute != null && f.time.minute >= 45 && f.time.minute < 50)) return "halftime";
  return "scheduled";
}

/** Normalize one raw SportMonks fixture row into the app `LiveFixture` shape. */
export function mapSmFixture(row: SMFixture, fallbackId: string): LiveFixture {
  const home = row.localTeam ?? {};
  const away = row.visitorTeam ?? {};
  const status = mapSmFixtureStatus(row);
  const minute = (row.time?.minute ?? 0) ?? 0;
  return {
    id: String(row.id ?? fallbackId),
    league: row.league?.name ?? "—",
    home: {
      name: home.name ?? "Home",
      badge: "⚽",
      score: row.scores?.localteam_score ?? 0,
      logo: home.image_path,
    },
    away: {
      name: away.name ?? "Away",
      badge: "⚽",
      score: row.scores?.visitorteam_score ?? 0,
      logo: away.image_path,
    },
    status,
    minute: status === "scheduled" ? 0 : minute,
    kickoff: (row.starting_at ?? "").slice(11, 16),
    performers: [],
  };
}

/* ------------------------------------------------------------------ */
/* Standings                                                           */
/* ------------------------------------------------------------------ */

/** Map a raw SportMonks standing row into the app `StandingRow`. */
export function mapSmStandingRow(row: SMStanding): StandingRow {
  const gf = row.details?.scores?.for ?? row.goals?.scored ?? row.details?.played ?? 0;
  const ga = row.details?.scores?.against ?? row.goals?.against ?? 0;
  const team = row.participant ?? row.team ?? {};
  return {
    rank: row.position ?? 0,
    team: {
      id: team.id ?? row.participant_id ?? row.team_id ?? 0,
      name: team.name ?? "—",
      logo: team.image_path ?? "",
    },
    points: row.points ?? 0,
    played: row.details?.played ?? row.played ?? 0,
    wins: row.details?.wins ?? row.won ?? 0,
    draws: row.details?.draws ?? row.drawn ?? 0,
    losses: row.details?.losses ?? row.lost ?? 0,
    goalsFor: gf,
    goalsAgainst: ga,
    goalDiff: row.goals?.difference ?? gf - ga,
    form: typeof row.form === "string" ? row.form : (row.form ?? []).join(""),
  };
}

/** Build a full `Standings` object from raw rows + league context. */
export function mapSmStandings(
  rows: SMStanding[],
  league: { id?: number; name?: string; image_path?: string },
  fallbackLeagueName: string,
  fallbackSeason: number,
): Standings {
  return {
    leagueId: league.id ?? 0,
    season: fallbackSeason,
    leagueName: league.name ?? fallbackLeagueName,
    logo: league.image_path ?? "",
    rows: rows.map(mapSmStandingRow),
    source: "api-football", // STMAP: product type only knows api-football|mock; revisit when product types are taught providers
  };
}

/* ------------------------------------------------------------------ */
/* Match details (events / stats / lineups)                            */
/* ------------------------------------------------------------------ */

/** Map a raw SportMonks event into the app `MatchEvent`. */
export function mapSmEvent(e: SMEvent): MatchEvent {
  const type = e.type ?? "";
  const eventType =
    /goal/i.test(type) ? "Goal"
      : /yellow|red|card/i.test(type) ? "Card"
        : /sub/i.test(type) ? "Subst"
          : /var/i.test(type) ? "Var"
            : type || "Goal";
  return {
    elapsed: e.minute ?? 0,
    extraTime: e.extra_minute,
    team: { id: e.participant_id ?? 0, name: "—" },
    player: { id: e.player_id ?? 0, name: e.player_name ?? "—" },
    assist: e.related_player_id ? { id: e.related_player_id, name: e.related_player_name ?? "—" } : undefined,
    type: eventType,
    detail: e.detail ?? e.reason ?? "",
  };
}

/** Flatten SportMonks statistics payload into paired home/away `MatchStat` rows. */
export function mapSmStatistics(groups: SMStatistic[]): MatchStat[] {
  // SportMonks statistics for a fixture are usually returned as an array where
  // each group holds that team's `stats`/`data` list. We collect per key and pair
  // the 1st (home) and 2nd (away) occurrence. STMAP: exact grouping validated in Step 2.
  const byKey = new Map<string, string[]>();
  const push = (key: string, value: string | number | null | undefined) => {
    if (!key) return;
    const arr = byKey.get(key) ?? [];
    arr.push(value == null ? "" : String(value));
    byKey.set(key, arr);
  };
  for (const g of groups) {
    const subs = g.stats && g.stats.length ? g.stats : g.data && g.data.length ? g.data : [];
    if (subs.length) {
      for (const it of subs) push(it.type?.name ?? it.name ?? String(it.type_id ?? ""), it.value);
    } else if (g.type || g.name) {
      push(g.name ?? g.type ?? "", g.value);
    }
  }
  const out: MatchStat[] = [];
  for (const [type, values] of byKey) {
    out.push({ type, home: values[0] ?? "—", away: values[1] ?? "—" });
  }
  return out;
}

function mapLineupPlayer(p: SMLineup): LineupPlayer {
  return {
    id: p.player_id ?? 0,
    name: p.player_name ?? p.player?.name ?? "—",
    number: p.number ?? 0,
    pos: p.position_id != null ? String(p.position_id) : "—",
    grid: p.formation_field,
  };
}

/** Map raw SportMonks lineups into paired `MatchLineup` rows. */
export function mapSmLineups(rows: SMLineup[], startXI: number[]): MatchLineup[] {
  // SportMonks `include=lineups` returns a flat per-player list; players whose id
  // is in `startXI` form the XI, the rest are substitutes. STMAP: grouping/shape
  // is finalised against a live response in Step 2.
  const grouped = new Map<number, { starters: SMLineup[]; subs: SMLineup[] }>();
  for (const row of rows) {
    const tid = row.participant_id ?? row.team_id ?? 0;
    const g = grouped.get(tid) ?? { starters: [], subs: [] };
    if (row.player_id != null && startXI.includes(row.player_id)) g.starters.push(row);
    else g.subs.push(row);
    grouped.set(tid, g);
  }
  return [...grouped.values()].map((g) => ({
    team: { id: 0, name: "—", logo: "" }, // STMAP: team info is embedded via `lineups.team` include; set in Step 2
    formation: "—",
    coach: "—",
    startXI: g.starters.map(mapLineupPlayer),
    substitutes: g.subs.map(mapLineupPlayer),
  }));
}

/** Build a full `MatchDetails` from a raw SportMonks fixture with includes. */
export function mapSmMatchDetails(
  fixtureId: number,
  f: Pick<SMFixture, "events" | "statistics" | "lineups" | "state_id">,
): MatchDetails {
  return {
    fixtureId,
    source: "api-football", // STMAP: product type only knows api-football|mock today
    events: (f.events ?? []).map(mapSmEvent),
    stats: mapSmStatistics(f.statistics ?? []),
    lineups: mapSmLineups(f.lineups ?? [], []),
    finished: f.state_id === 6 || f.state_id === 7,
  };
}

/* ------------------------------------------------------------------ */
/* Injuries                                                            */
/* ------------------------------------------------------------------ */

/** Map a raw SportMonks injury row into the app `Injury`. */
export function mapSmInjury(row: SMInjury): Injury {
  return {
    player: {
      id: row.player_id ?? row.player?.id ?? 0,
      name: row.player_name ?? row.player?.name ?? "—",
      photo: row.player?.image_path,
    },
    team: { id: row.team_id ?? row.team?.id ?? 0, name: row.team?.name ?? "—" },
    fixture: row.fixture_id ? { id: row.fixture_id, date: row.starting_at } : undefined,
    type: row.type,
    reason: row.reason,
    status: row.status,
  };
}

/* ------------------------------------------------------------------ */
/* Players                                                             */
/* ------------------------------------------------------------------ */

function toNum(raw?: number | string | null): number | undefined {
  if (raw == null) return undefined;
  const n = typeof raw === "string" ? parseFloat(raw.replace(/[^\d.]/g, "")) : raw;
  return Number.isFinite(n) ? n : undefined;
}

function playerName(p: SMPlayer): string {
  return p.name ?? (`${p.firstname ?? ""} ${p.lastname ?? ""}`.trim() || "—");
}

/**
 * Map a raw SportMonks player into the app `WorldPlayer`. `stats[0]` (the
 * current season's stats row, embedded via `include=stats`) contributes league,
 * club, position and goals where available.
 */
export function mapSmWorldPlayer(p: SMPlayer, stats?: { team?: SMTeam; league?: SMLeague; position_id?: number; goals?: { total?: number } }[]): WorldPlayer {
  const s = stats?.[0];
  const birth = p.date_of_birth ? new Date(p.date_of_birth) : null;
  const age = birth && !Number.isNaN(birth.getTime()) ? Math.max(0, Math.floor((Date.now() - birth.getTime()) / (365.25 * 86400_000))) : undefined;
  return {
    id: p.id ?? 0,
    name: playerName(p),
    firstname: p.firstname,
    lastname: p.lastname,
    age,
    nationality: p.nationality ?? p.country?.name,
    position: s?.position_id != null ? String(s.position_id) : p.position_id != null ? String(p.position_id) : undefined,
    photo: p.image_path,
    heightCm: toNum(p.height),
    weightKg: toNum(p.weight),
    club: s?.team?.name,
    goals: s?.goals?.total,
    league: s?.league?.name,
  };
}

function clampAttr(v: number): number {
  return Math.max(35, Math.min(99, Math.round(v)));
}

function hash(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

function tierFor(score: number): Tier {
  if (score >= 88) return "icon";
  if (score >= 82) return "elite";
  if (score >= 74) return "gold";
  if (score >= 66) return "silver";
  return "bronze";
}

const attrKeys = (keys: string[], base: number, seed: string) =>
  keys.map((key, i) => ({ key, value: clampAttr(base + ((hash(seed + key) + i * 7) % 17) - 8) }));

export type SMPlayerSeason = {
  team?: SMTeam;
  league?: SMLeague;
  position_id?: number;
  games?: { appearences?: number; minutes?: number };
  goals?: { total?: number; assists?: number };
  passes?: { accuracy?: number };
  [k: string]: unknown;
};

/**
 * Build a full FootCard `PlayerCardData` from a raw SportMonks player + its
 * embedded per-season stats. Attribute derivation mirrors the API-Football card
 * builder in `player-search.functions.ts` so the same player looks comparable
 * regardless of provider.
 */
export function mapSmPlayerCard(p: SMPlayer, season?: SMPlayerSeason): PlayerCardData {
  const seed = String(p.id ?? 0);
  const minutes = Math.max(90, season?.games?.minutes ?? (season?.games?.appearences ?? 1) * 60);
  const per90 = (v?: number) => ((v ?? 0) / minutes) * 90;
  const goals = season?.goals?.total ?? 0;
  const assists = season?.goals?.assists ?? 0;
  const passAcc = season?.passes?.accuracy ?? 72;
  const base = clampAttr(42 + Math.min(goals * 3, 30));
  const posId = season?.position_id ?? p.position_id;
  const pos =
    posId != null
      ? posId <= 1 ? "GK" : posId <= 4 ? "DF" : posId <= 6 ? "MF" : "ST"
      : "CM";
  const core = {
    pac: clampAttr(base + (pos === "DF" ? -2 : 4) + ((hash(seed + "pac") % 13) - 6)),
    sho: clampAttr(base + per90(goals) * 22 - 6),
    pas: clampAttr(base + passAcc * 0.18 + per90(assists) * 6 - 12),
    dri: clampAttr(base + 4),
    def: clampAttr(base + (pos === "DF" ? 8 : pos === "ST" ? -18 : -4)),
    phy: clampAttr(base + ((toNum(p.weight) ?? 75) * 0.05) - 2),
  };
  const overall = Math.round((core.pac + core.sho + core.pas + core.dri + core.def + core.phy) / 6);
  const birth = p.date_of_birth ? new Date(p.date_of_birth) : null;
  const age = birth && !Number.isNaN(birth.getTime()) ? Math.max(0, Math.floor((Date.now() - birth.getTime()) / (365.25 * 86400_000))) : 0;
  return {
    id: `sm-${p.id}`,
    type: "player",
    name: playerName(p),
    club: season?.team?.name ?? "Free Agent",
    clubBadge: season?.team?.image_path ?? "⚽",
    nation: p.nationality ?? "🌍",
    position: pos,
    tier: tierFor(overall),
    core,
    age,
    heightCm: toNum(p.height) ?? 180,
    weightKg: toNum(p.weight) ?? 75,
    foot: hash(seed) % 4 === 0 ? "left" : "right",
    marketValue: "—",
    contractUntil: "—",
    injuries: null,
    technical: attrKeys(
      ["finishing", "shotPower", "longShots", "volleys", "penalties", "curve", "freeKick", "crossing", "shortPassing", "longPassing", "vision", "ballControl", "dribblingAttr", "heading"],
      (core.sho + core.pas + core.dri) / 3,
      seed,
    ),
    physical: attrKeys(["acceleration", "sprintSpeed", "agility", "balance", "stamina", "strength", "jumping", "reactions"], (core.pac + core.phy) / 2, seed),
    mental: attrKeys(["positioning", "offTheBall", "composure", "aggression", "interceptions", "marking", "standingTackle", "slidingTackle", "defAwareness", "workRate", "leadership", "flair"], (core.def + core.pas) / 2, seed),
    form: clampAttr(overall),
    careerGoals: goals,
    photo: p.image_path,
    league: season?.league?.name ?? undefined,
  };
}

/* ------------------------------------------------------------------ */
/* Teams                                                               */
/* ------------------------------------------------------------------ */

/** Map a raw SportMonks team + embedded squad into the app `TeamPageData`. */
export function mapSmTeamPage(
  team: SMTeam,
  squad?: SMPlayer[],
  extra?: { country?: string; founded?: number; venue_name?: string; venue_city?: string; venue_capacity?: number },
): TeamPageData {
  return {
    id: team.id ?? 0,
    name: team.name ?? "—",
    logo: team.image_path,
    country: extra?.country,
    founded: extra?.founded,
    venueName: extra?.venue_name,
    venueCity: extra?.venue_city,
    venueCapacity: extra?.venue_capacity,
    squad: (squad ?? []).map((p) => ({
      id: p.id ?? 0,
      name: playerName(p),
      age: p.date_of_birth ? Math.max(0, Math.floor((Date.now() - new Date(p.date_of_birth).getTime()) / (365.25 * 86400_000))) : undefined,
      number: undefined,
      position: p.position_id != null ? String(p.position_id) : undefined,
      photo: p.image_path ?? "",
    })),
  };
}

/** Map a raw SportMonks team into a lightweight `TeamSearchHit`. */
export function mapSmTeamHit(team: SMTeam): TeamSearchHit {
  return {
    id: team.id ?? 0,
    name: team.name ?? "—",
    logo: team.image_path,
    country: team.country_id != null ? String(team.country_id) : undefined,
  };
}
