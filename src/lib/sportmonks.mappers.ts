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

import type { LiveFixture, LiveHighlight } from "@/lib/live";
import type {
  H2HRecord,
  Injury,
  LineupPlayer,
  MatchDetailEvent,
  MatchDetailLineup,
  MatchDetailLineupRow,
  MatchDetailPage,
  MatchDetailStat,
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
import type { Fixture } from "@/lib/football-data.functions";

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
  id?: number | undefined;
  name?: string | undefined;
  /** Display name without middle/second names (e.g. "Lionel Messi"). */
  display_name?: string | undefined;
  /** Short display name (e.g. "L. Messi"). */
  common_name?: string | undefined;
  firstname?: string | undefined;
  lastname?: string | undefined;
  image_path?: string | undefined;
  date_of_birth?: string | undefined;
  height?: number | string | null | undefined;
  weight?: number | string | null | undefined;
  position_id?: number | undefined;
  nationality?: string | undefined;
  country?: { id?: number; name?: string; image_path?: string } | null;
  /** Position resource — real name via `?include=position` (e.g. "Attacker"). */
  position?: { id?: number; name?: string } | null;
};

/** SportMonks generic position ids -> display names (fallback when the
 * `position` include is unavailable). Detailed position ids exist too; they
 * fall through to their raw id string rather than a wrong label. */
export const SM_POSITION_NAMES: Record<number, string> = {
  24: "Goalkeeper",
  25: "Defender",
  26: "Midfielder",
  27: "Attacker",
};

/** Resolve a display position name, preferring the included position resource. */
export function smPositionName(p: {
  position?: { id?: number; name?: string } | null | undefined;
  position_id?: number | undefined;
}): string | undefined {
  if (p.position?.name) return p.position.name;
  if (p.position_id != null) return SM_POSITION_NAMES[p.position_id] ?? String(p.position_id);
  return undefined;
}

export type SMFixture = {
  id?: number;
  league_id?: number;
  season_id?: number;
  state_id?: number;
  localteam_id?: number;
  visitorteam_id?: number;
  starting_at?: string;
  /** Display string of the form "HomeTeam vs AwayTeam" — the only reliable team
   * name source on plans where the `localTeam`/`visitorTeam` includes are gated. */
  name?: string;
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
  /** SportMonks event descriptor, e.g. "1st Goal" / "Yellow Card". */
  addition?: string;
  /** E.g. "Header" / "Hand-ball" — used as a secondary detail. */
  info?: string;
};

/* ------------------------------------------------------------------ */
/* In-play (livescores/inplay) raw shapes                              */
/* ------------------------------------------------------------------ */

/** A participant (team) embedded via `include=participants` on the in-play
 * endpoint. `meta.location` is "home"|"away"; `image_path` is the team crest. */
export type SMInplayParticipant = {
  id?: number;
  name?: string;
  short_code?: string;
  image_path?: string;
  meta?: {
    location?: string;
    winner?: string | null;
    position?: number | null;
  } | null;
};

/** A score row embedded via `include=scores` on the in-play endpoint. In-play
 * score rows carry `score.participant` ("home"/"away") and a `description`
 * ("CURRENT" | "1ST_HALF" | "2ND_HALF"), unlike `SMFixture.scores` (an object). */
export type SMInplayScore = {
  participant_id?: number;
  score?: { goals?: number | null; participant?: string };
  description?: string;
};

/** A period row embedded via `include=periods` on the in-play endpoint. The
 * ticking / last-open period determines the current minute + phase. */
export type SMInplayPeriod = {
  description?: string;
  ticking?: boolean;
  minutes?: number;
  seconds?: number;
  time_added?: number | null;
  ended?: number | null;
  started?: number | null;
};

/**
 * A raw SportMonks fixture row as returned by `GET /livescores/inplay`. The
 * endpoint's top-level envelope is `{ data: [...] }` (NOT `{data, meta}`), and
 * its `scores` is an ARRAY (unlike `SMFixture.scores`, an object), so it is typed
 * separately rather than reusing `SportMonksList`/`SMFixture`.
 */
export type SMInplayFixture = Omit<SMFixture, "scores"> & {
  participants?: SMInplayParticipant[];
  /** Array of score rows on the in-play endpoint. */
  scores?: SMInplayScore[];
  periods?: SMInplayPeriod[];
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
  stats?: {
    type?: { name?: string };
    type_id?: number;
    value?: string | number | null;
    name?: string;
  }[];
  data?: {
    type?: { name?: string };
    type_id?: number;
    value?: string | number | null;
    name?: string;
  }[];
};

export type SMLineup = {
  id?: number;
  player_id?: number;
  player_name?: string;
  team_id?: number;
  participant_id?: number;
  position_id?: number;
  formation_field?: string;
  /** Index within the formation (1..11 for the starting XI). */
  formation_position?: number;
  number?: number;
  /** 11 = starting XI, 12 = substitute (confirmed on live plan data). */
  type_id?: number;
  /** Shirt number (SportMonks field). */
  jersey_number?: number;
  type?: string;
  player?: SMPlayer | null;
  lineup?: {
    formation?: string;
    formation_position?: string;
    [k: string]: unknown;
  } | null;
};

/* ------------------------------------------------------------------ */
/* Match detail (fixtures/{id}) raw shapes                             */
/* ------------------------------------------------------------------ */

/**
 * A single flat statistics row as returned by `GET /fixtures/{id}?include=statistics.type`.
 * Unlike the legacy (wrong) nested `SMStatistic` shape, each row is a flat object:
 * `{ type_id, participant_id, location: "home"|"away", data: { value }, type: { name, code, ... } }`.
 */
export type SMStatRow = {
  type_id?: number;
  participant_id?: number;
  location?: string;
  data?: { value?: string | number | null };
  type?: { id?: number; name?: string; code?: string; developer_name?: string };
};

/**
 * A full raw fixture-detail payload from `GET /fixtures/{id}` with the Step-2
 * includes (`participants;scores;periods;events;lineups;lineups.player;statistics.type`).
 * `scores` is an ARRAY here (like the in-play endpoint), so it overrides
 * `SMFixture.scores` (an object).
 */
export type SMDetailFixture = Omit<SMFixture, "scores" | "events" | "statistics"> & {
  participants?: SMInplayParticipant[];
  scores?: SMInplayScore[];
  periods?: SMInplayPeriod[];
  events?: SMEvent[];
  lineups?: SMLineup[];
  statistics?: SMStatRow[];
  league?: SMLeague | null;
};

/**
 * A raw H2H fixture row from `GET /fixtures/head-to-head/{home}/{away}`. When
 * `include=scores;participants` is passed, `scores` (array, CURRENT rows) and
 * `participants` (`meta.location`) are embedded for logos + scores.
 */
export type SMH2HFixture = {
  id?: number;
  name?: string;
  starting_at?: string;
  result_info?: string | null;
  league_id?: number;
  state_id?: number;
  participants?: SMInplayParticipant[];
  scores?: SMInplayScore[];
};

/** One standing `details` cell — the real SportMonks shape is a flat array of
 * `{ type_id, value }` rows (NOT a single object), embedded via `include=details`. */
export type SMStandingDetail = {
  id?: number;
  type_id?: number;
  value?: number | string | null;
};

/** One standing `form` entry — the real shape is an array of `{ form, sort_order }`
 * rows, embedded via `include=form`. */
export type SMStandingForm = {
  form?: string;
  sort_order?: number;
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
  /** Real SportMonks shape: `include=details` embeds a flat array of cells. */
  details?: SMStandingDetail[];
  /** Real SportMonks shape: `include=form` embeds an array of entries. */
  form?: string | SMStandingForm[];
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
  if (
    state === 5 ||
    (state != null && state > 1 && state !== 55 && f.time?.minute != null && f.time.minute > 0)
  ) {
    return "live";
  }
  if (state === 55 || (f.time?.minute != null && f.time.minute >= 45 && f.time.minute < 50))
    return "halftime";
  return "scheduled";
}

/**
 * Split SportMonks' `name` display string ("HomeTeam vs AwayTeam") into home and
 * away team names. Used when the `localTeam`/`visitorTeam` includes are not
 * granted on a plan (they 404 on the current one), so the live feed still has
 * real team names rather than "Home"/"Away".
 */
export function smFixtureTeamNames(name?: string): [string, string] {
  if (!name) return ["Home", "Away"];
  const marker = name.toLowerCase().indexOf(" vs ");
  if (marker > 0) {
    const home = name.slice(0, marker).trim();
    const away = name.slice(marker + 4).trim();
    if (home && away) return [home, away];
  }
  return ["Home", "Away"];
}

/** Normalize one raw SportMonks fixture row into the app `LiveFixture` shape. */
export function mapSmFixture(row: SMFixture, fallbackId: string): LiveFixture {
  const home = row.localTeam ?? {};
  const away = row.visitorTeam ?? {};
  const [homeName, awayName] = smFixtureTeamNames(row.name);
  const status = mapSmFixtureStatus(row);
  const minute = row.time?.minute ?? 0;
  return {
    id: String(row.id ?? fallbackId),
    league: row.league?.name ?? "—",
    home: {
      name: home.name ?? homeName,
      badge: "⚽",
      score: row.scores?.localteam_score ?? 0,
      logo: home.image_path,
    },
    away: {
      name: away.name ?? awayName,
      badge: "⚽",
      score: row.scores?.visitorteam_score ?? 0,
      logo: away.image_path,
    },
    status,
    minute: status === "scheduled" ? 0 : minute,
    kickoff: (row.starting_at ?? "").slice(11, 16),
    date: (row.starting_at ?? "").slice(0, 10) || undefined,
    performers: [],
  };
}

/* ------------------------------------------------------------------ */
/* In-play fixture mapping (livescores/inplay)                         */
/* ------------------------------------------------------------------ */

/** Derive the fine-grained in-play phase from a SportMonks period description
 * (e.g. "1st-half", "2nd-half", "half-time", "extra-time", "penalties"). */
function inplayPhase(desc?: string): LiveFixture["phase"] | undefined {
  const d = (desc ?? "").toLowerCase().trim();
  if (!d) return undefined;
  if (d.includes("1st-half") || d === "1st half" || d.startsWith("1st")) return "first-half";
  if (d.includes("2nd-half") || d === "2nd half" || d.startsWith("2nd")) return "second-half";
  if (d.includes("half-time") || d.includes("halftime") || d === "half time") return "halftime";
  if (d.includes("extra-time") || d.includes("extra time")) return "extra-time";
  if (d.includes("penalt")) return "penalties";
  return undefined;
}

/**
 * SportMonks `livescores/inplay` fixture `state_id` → coarse status (fallback
 * only — `periods` is the primary driver in `deriveInplayPeriod`).
 *
 * ⚠️ The in-play endpoint does NOT use the 1-5 enumeration this file previously
 * assumed. Observed on the live payload:
 *   22 = live, 9 = penalty shootout (still in play), 5 = finished (FT),
 *   4  = finished (both periods ended; the row lingers in the feed after FT).
 * Unknown/absent ids return undefined so the caller falls back to `periods`.
 */
function inplayStateStatus(
  stateId?: number,
): "scheduled" | "live" | "halftime" | "finished" | undefined {
  switch (stateId) {
    case 1:
      return "scheduled";
    case 22:
      return "live";
    case 9:
      return "live"; // penalty shootout — still in play
    case 4:
    case 5:
      return "finished";
    default:
      return undefined;
  }
}

/** SportMonks in-play `state_id` → fine-grained phase (fallback only). */
function inplayStatePhase(stateId?: number): LiveFixture["phase"] | undefined {
  switch (stateId) {
    case 9:
      return "penalties";
    default:
      return undefined;
  }
}

/**
 * SportMonks schedule-fixture `state_id` → coarse status. Schedule fixtures
 * (`/schedules/seasons/{id}`) keep the classic enumeration (1 scheduled,
 * 2 first-half live, 3 halftime, 4 second-half live, 5 finished), which differs
 * from the `livescores/inplay` convention — so they use their own mapping.
 */
function scheduleStateStatus(
  stateId?: number,
): "scheduled" | "live" | "halftime" | "finished" | undefined {
  switch (stateId) {
    case 1:
      return "scheduled";
    case 2:
    case 4:
      return "live";
    case 3:
      return "halftime";
    case 5:
      return "finished";
    default:
      return undefined;
  }
}

/**
 * Shared helper that derives { status, minute, phase, addedTime } from a
 * fixture's `periods` array (the primary source of truth) with `state_id` as a
 * fallback.
 *
 * ⚠️ The `livescores/inplay` endpoint does NOT use the 1-5 state enumeration:
 * live rows carry `state_id` 22, just-finished rows still lingering in the feed
 * carry `state_id` 4/5, and a penalty shootout carries `state_id` 9. The reliable
 * signal is therefore the `periods` array:
 *   - any period with `ticking: true` → live (its `description` gives the phase,
 *     its `minutes`(+`time_added`) gives the minute);
 *   - otherwise, all periods carry an `ended` timestamp → finished.
 * Halftime is preserved when the only ticking-capable period is a "half-time"/"HT"
 * period, or the 1st half has ended with no ticking 2nd half yet.
 * Used by both the in-play fixture mapper and the match-detail page mapper so
 * their status/minute/phase semantics stay identical.
 */
export function deriveInplayPeriod(
  periods: SMInplayPeriod[] | undefined,
  stateId?: number,
): {
  status: "scheduled" | "live" | "halftime" | "finished";
  minute: number;
  phase: LiveFixture["phase"] | undefined;
  addedTime: number | undefined;
} {
  const list = periods ?? [];
  const phaseOf = (p?: SMInplayPeriod) => inplayPhase(p?.description);
  const addedOf = (p?: SMInplayPeriod) => (p?.time_added != null ? p.time_added : undefined);

  // No periods at all → defer entirely to the (fallback) state mapping.
  if (!list.length) {
    return {
      status: inplayStateStatus(stateId) ?? "scheduled",
      minute: 0,
      phase: inplayStatePhase(stateId),
      addedTime: undefined,
    };
  }

  // 1) A ticking period is the live clock: its description gives the phase and
  //    its minutes/time_added give the match minute + stoppage.
  const ticking = list.find((p) => p.ticking === true);
  if (ticking) {
    const phase = phaseOf(ticking);
    return {
      status: phase === "halftime" ? "halftime" : "live",
      minute: ticking.minutes ?? 0,
      phase,
      addedTime: addedOf(ticking),
    };
  }

  // 2) An explicit "half-time"/"HT" period → half-time.
  const htPeriod = list.find((p) => phaseOf(p) === "halftime");
  if (htPeriod) {
    return {
      status: "halftime",
      minute: htPeriod.minutes ?? 0,
      phase: "halftime",
      addedTime: addedOf(htPeriod),
    };
  }

  // 3) A final period (2nd-half / extra-time / penalties) that has ended means
  //    the match is over — even when the row still lingers in the in-play feed
  //    with state_id 4/5. Find the latest such period (so a shootout that ended
  //    resolves to "penalties", not "second-half").
  const finalPhases: LiveFixture["phase"][] = ["second-half", "extra-time", "penalties"];
  const finalEnded = [...list].reverse().find((p) => {
    const ph = phaseOf(p);
    return ph != null && finalPhases.includes(ph) && p.ended != null;
  });
  if (finalEnded) {
    return {
      status: "finished",
      minute: finalEnded.minutes ?? 0,
      phase: phaseOf(finalEnded),
      addedTime: addedOf(finalEnded),
    };
  }

  // 4) 1st half ended but no final period has ended → half-time (the 2nd half
  //    hasn't started/ticked yet).
  const firstHalf = list.find((p) => phaseOf(p) === "first-half");
  if (firstHalf && firstHalf.ended != null) {
    return {
      status: "halftime",
      minute: firstHalf.minutes ?? 0,
      phase: "halftime",
      addedTime: addedOf(firstHalf),
    };
  }

  // 5) Fallback: periods present but ambiguous → scheduled unless state_id says
  //    otherwise.
  const last = list[list.length - 1];
  return {
    status: inplayStateStatus(stateId) ?? "scheduled",
    minute: last?.minutes ?? 0,
    phase: inplayStatePhase(stateId) ?? phaseOf(last),
    addedTime: addedOf(last),
  };
}

/** Map in-play events into highlights, resolving side by participant id and
 * classifying kind from the event's combined text. Unknown events are skipped
 * (never fabricated). */
function mapInplayHighlights(events: SMEvent[], homeId?: number, awayId?: number): LiveHighlight[] {
  const out: LiveHighlight[] = [];
  for (const e of events) {
    if (e.participant_id == null) continue;
    const side =
      e.participant_id === homeId ? "home" : e.participant_id === awayId ? "away" : undefined;
    if (!side) continue;
    const label = [e.addition, e.type, e.info, e.reason, e.detail]
      .filter((v): v is string => typeof v === "string" && v.length > 0)
      .join(" ")
      .toLowerCase();
    // Order matters: a penalty goal contains both "penalty" and "goal" — call it a penalty.
    let kind: LiveHighlight["kind"] | null = null;
    if (/penalt|\ppen\b/.test(label)) kind = "penalty";
    else if (/red card/.test(label)) kind = "red-card";
    else if (/yellow card|yellowcard/.test(label)) kind = "yellow-card";
    else if (/goal|own goal|header|shot/.test(label)) kind = "goal";
    if (!kind) continue;
    out.push({
      minute: e.minute ?? 0,
      kind,
      side,
      player: e.player_name ?? "—",
      detail: e.addition ?? e.info ?? e.detail ?? e.reason ?? undefined,
    });
  }
  return out;
}

/**
 * Map a raw SportMonks in-play fixture row (from `GET /livescores/inplay`) into
 * the app `LiveFixture` shape. Resolves home/away from `participants` by
 * `meta.location`, scores from CURRENT `scores` entries, and status/minute/phase
 * from `periods`. The endpoint only returns in-play fixtures, but the mapping is
 * defensive for finished/scheduled fallbacks.
 */
export function mapSmInplayFixture(row: SMInplayFixture, fallbackId: string): LiveFixture {
  const participants = row.participants ?? [];
  const homeP = participants.find((p) => p.meta?.location === "home");
  const awayP = participants.find((p) => p.meta?.location === "away");
  const [nameHome, nameAway] = smFixtureTeamNames(row.name);

  const home = {
    name: homeP?.name ?? nameHome,
    badge: "⚽",
    score: 0,
    logo: homeP?.image_path,
    id: homeP?.id,
  };
  const away = {
    name: awayP?.name ?? nameAway,
    badge: "⚽",
    score: 0,
    logo: awayP?.image_path,
    id: awayP?.id,
  };

  // Current score from CURRENT score rows, keyed by score.participant.
  for (const s of row.scores ?? []) {
    if (s.description !== "CURRENT") continue;
    const side = s.score?.participant;
    const goals = s.score?.goals ?? 0;
    if (side === "home") home.score = goals;
    else if (side === "away") away.score = goals;
  }

  // Current period = the ticking one, else the last open (ended === null), else
  // the last period. Phase + minute + addedTime derive from it (shared with the
  // match-detail page mapper so in-play and detail semantics stay identical).
  const { status, minute, phase, addedTime } = deriveInplayPeriod(row.periods, row.state_id);

  const highlights = mapInplayHighlights(row.events ?? [], homeP?.id, awayP?.id);

  return {
    id: String(row.id ?? fallbackId),
    league: row.league?.name ?? "—",
    leagueId: row.league_id ?? row.league?.id,
    leagueLogo: row.league?.image_path,
    home,
    away,
    status,
    minute,
    kickoff: (row.starting_at ?? "").slice(11, 16),
    date: (row.starting_at ?? "").slice(0, 10) || undefined,
    phase,
    addedTime,
    highlights: highlights.length ? highlights : undefined,
    performers: [],
  };
}

/** Map a raw SportMonks fixture row into the app `Fixture` shape used by league
 * fixture lists and the fixture modal. */
export function mapSmFixtureBrief(row: SMFixture, leagueId: number, date: string): Fixture {
  const status = mapSmFixtureStatus(row);
  const [homeName, awayName] = smFixtureTeamNames(row.name);
  return {
    id: row.id ?? 0,
    date: (row.starting_at ?? date).slice(0, 10),
    league: {
      id: row.league_id ?? leagueId,
      name: row.league?.name ?? "—",
      logo: row.league?.image_path ?? "",
    },
    home: {
      id: row.localteam_id ?? 0,
      name: homeName,
      logo: row.localTeam?.image_path ?? "",
      score: row.scores?.localteam_score ?? undefined,
    },
    away: {
      id: row.visitorteam_id ?? 0,
      name: awayName,
      logo: row.visitorTeam?.image_path ?? "",
      score: row.scores?.visitorteam_score ?? undefined,
    },
    status,
    minute: row.time?.minute ?? undefined,
    source: "api-football",
  };
}

/* ------------------------------------------------------------------ */
/* Schedule fixtures (schedules/seasons/{id})                          */
/* ------------------------------------------------------------------ */

/**
 * A fixture row embedded in a schedule round. Unlike the `/fixtures` resource,
 * schedule fixtures carry `participants` (with `meta.location`) and a `scores`
 * ARRAY (CURRENT rows) — not `localTeam`/`visitorTeam`/`scores` object. They
 * use the classic schedule `state_id` convention (1 scheduled, 2/4 live,
 * 3 halftime, 5 finished), which differs from the `livescores/inplay` ids
 * (22 live, 9 penalties, 4/5 finished).
 */
export type SMScheduleFixture = {
  id?: number;
  league_id?: number;
  season_id?: number;
  stage_id?: number;
  round_id?: number;
  state_id?: number;
  name?: string;
  starting_at?: string;
  result_info?: string | null;
  participants?: SMInplayParticipant[];
  scores?: SMInplayScore[];
  league?: SMLeague | null;
};

export type SMScheduleRound = {
  id?: number;
  name?: string;
  starting_at?: string;
  ending_at?: string;
  fixtures?: SMScheduleFixture[];
};

export type SMScheduleStage = {
  id?: number;
  name?: string;
  rounds?: SMScheduleRound[];
};

/** Normalize SportMonks' "YYYY-MM-DD HH:MM:SS" (UTC) into an ISO 8601 string. */
function smDateTime(raw?: string): string | undefined {
  if (!raw) return undefined;
  if (!raw.includes("T") && /^\d{4}-\d{2}-\d{2} /.test(raw)) return `${raw.replace(" ", "T")}Z`;
  return raw;
}

/** Map one schedule fixture row into the app `Fixture` shape. Resolves teams
 * from `participants` (by `meta.location`) and scores from CURRENT rows. */
export function mapSmScheduleFixture(
  row: SMScheduleFixture,
  leagueId: number,
  leagueName: string,
): Fixture {
  const participants = row.participants ?? [];
  const homeP = participants.find((p) => p.meta?.location === "home");
  const awayP = participants.find((p) => p.meta?.location === "away");
  const [nameHome, nameAway] = smFixtureTeamNames(row.name);
  let homeScore: number | undefined;
  let awayScore: number | undefined;
  for (const s of row.scores ?? []) {
    if (s.description !== "CURRENT") continue;
    const side = s.score?.participant;
    const goals = s.score?.goals ?? 0;
    if (side === "home") homeScore = goals;
    else if (side === "away") awayScore = goals;
  }
  // Schedule fixtures use the classic schedule state ids (1 scheduled, 2/4 live,
  // 3 halftime, 5 finished); fall back to the `/fixtures` convention when the id
  // is unknown. (Deliberately separate from the in-play `livescores/inplay` ids.)
  const status = scheduleStateStatus(row.state_id) ?? mapSmFixtureStatus(row);
  const start = smDateTime(row.starting_at);
  return {
    id: row.id ?? 0,
    date: (start ?? "").slice(0, 10),
    kickoff: start,
    league: {
      id: row.league_id ?? leagueId,
      name: row.league?.name ?? leagueName,
      logo: row.league?.image_path ?? "",
    },
    home: {
      id: homeP?.id ?? 0,
      name: homeP?.name ?? nameHome,
      logo: homeP?.image_path ?? "",
      score: homeScore,
    },
    away: {
      id: awayP?.id ?? 0,
      name: awayP?.name ?? nameAway,
      logo: awayP?.image_path ?? "",
      score: awayScore,
    },
    status,
    source: "api-football",
  };
}

/** Flatten a schedules payload (stages → rounds → fixtures) into `Fixture`s,
 * sorted chronologically by kickoff. */
export function mapSmScheduleFixtures(
  stages: SMScheduleStage[],
  leagueId: number,
  leagueName: string,
): Fixture[] {
  const out: Fixture[] = [];
  for (const stage of stages) {
    for (const round of stage.rounds ?? []) {
      for (const f of round.fixtures ?? []) out.push(mapSmScheduleFixture(f, leagueId, leagueName));
    }
  }
  out.sort((a, b) => (a.kickoff ?? a.date).localeCompare(b.kickoff ?? b.date));
  return out;
}

/* ------------------------------------------------------------------ */
/* Standings                                                           */
/* ------------------------------------------------------------------ */

/**
 * SportMonks standing `details` type ids (validated against the live
 * `standings/seasons/{id}?include=details` response):
 *   129 = played, 130 = won, 131 = drawn, 132 = lost,
 *   133 = goals for, 134 = goals against, 179 = goal difference.
 */
const SM_STANDING_DETAIL = {
  played: 129,
  won: 130,
  drawn: 131,
  lost: 132,
  goalsFor: 133,
  goalsAgainst: 134,
  goalDiff: 179,
} as const;

/** Pull one numeric stat out of the flat `details` array (0 when absent). */
function smStandingStat(details: SMStandingDetail[] | undefined, typeId: number): number {
  const cell = (details ?? []).find((d) => d.type_id === typeId);
  const v = cell?.value;
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  if (typeof v === "string") {
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

/** Collapse the `form` array (`[{form:"W",sort_order:1},…]`) into a left-to-right
 * string, falling back to a raw string / legacy array-of-chars form. */
function smStandingForm(form: SMStanding["form"]): string {
  if (Array.isArray(form)) {
    return [...form]
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
      .map((f) => (typeof f === "string" ? f : (f.form ?? "")))
      .join("");
  }
  return typeof form === "string" ? form : "";
}

/** Map a raw SportMonks standing row into the app `StandingRow`. */
export function mapSmStandingRow(row: SMStanding): StandingRow {
  const team = row.participant ?? row.team ?? {};
  const gf = smStandingStat(row.details, SM_STANDING_DETAIL.goalsFor) || row.goals?.scored || 0;
  const ga =
    smStandingStat(row.details, SM_STANDING_DETAIL.goalsAgainst) || row.goals?.against || 0;
  const goalDiff = smStandingStat(row.details, SM_STANDING_DETAIL.goalDiff);
  const hasDiff = (row.details ?? []).some((d) => d.type_id === SM_STANDING_DETAIL.goalDiff);
  return {
    rank: row.position ?? 0,
    team: {
      id: team.id ?? row.participant_id ?? row.team_id ?? 0,
      name: team.name ?? "—",
      logo: team.image_path ?? "",
    },
    points: row.points ?? 0,
    played: smStandingStat(row.details, SM_STANDING_DETAIL.played) || row.played || 0,
    wins: smStandingStat(row.details, SM_STANDING_DETAIL.won) || row.won || 0,
    draws: smStandingStat(row.details, SM_STANDING_DETAIL.drawn) || row.drawn || 0,
    losses: smStandingStat(row.details, SM_STANDING_DETAIL.lost) || row.lost || 0,
    goalsFor: gf,
    goalsAgainst: ga,
    goalDiff: hasDiff ? goalDiff : (row.goals?.difference ?? gf - ga),
    form: smStandingForm(row.form),
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
    rows: [...rows].sort((a, b) => (a.position ?? 0) - (b.position ?? 0)).map(mapSmStandingRow),
    source: "api-football", // STMAP: product type only knows api-football|mock; revisit when product types are taught providers
  };
}

/* ------------------------------------------------------------------ */
/* Match details (events / stats / lineups)                            */
/* ------------------------------------------------------------------ */

/** Map a raw SportMonks event into the app `MatchEvent`. */
export function mapSmEvent(e: SMEvent): MatchEvent {
  // SportMonks v3 events carry `type_id` rather than a free-text `type`; the
  // human-readable `addition`/`info` fields describe the action reliably, so we
  // derive the coarse event type from them (case-insensitive).
  const label = [e.addition, e.type, e.info, e.reason, e.detail].filter(Boolean).join(" ");
  const l = label.toLowerCase();
  const eventType = /subst|substitution|in play|on for/i.test(l)
    ? "Subst"
    : /red card|yellow card|(^| )card/i.test(l)
      ? "Card"
      : /var|video assistant/i.test(l)
        ? "Var"
        : /goal|penalty scored|own goal|header|shot/i.test(l)
          ? "Goal"
          : e.type || "Event";
  return {
    elapsed: e.minute ?? 0,
    extraTime: e.extra_minute,
    team: { id: e.participant_id ?? 0, name: "—" },
    player: { id: e.player_id ?? 0, name: e.player_name ?? "—" },
    assist: e.related_player_id
      ? { id: e.related_player_id, name: e.related_player_name ?? "—" }
      : undefined,
    type: eventType,
    detail: e.addition ?? e.info ?? e.detail ?? e.reason ?? "",
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
    number: p.jersey_number ?? p.number ?? 0,
    pos: p.position_id != null ? String(p.position_id) : "—",
    grid: p.formation_field,
  };
}

/** Map raw SportMonks lineups into paired `MatchLineup` rows. */
export function mapSmLineups(rows: SMLineup[], startXI: number[] = []): MatchLineup[] {
  // SportMonks `include=lineups` returns a flat per-player list with `team_id`
  // and a `type_id` that marks starters (11) vs substitutes (12). We group by
  // team and prefer `type_id`; the caller may also pass `startXI` ids as a
  // fallback discriminator.
  const grouped = new Map<number, { starters: SMLineup[]; subs: SMLineup[] }>();
  for (const row of rows) {
    const tid = row.participant_id ?? row.team_id ?? 0;
    const g = grouped.get(tid) ?? { starters: [], subs: [] };
    const isStarter =
      row.type_id != null
        ? row.type_id === 11
        : row.player_id != null && startXI.includes(row.player_id);
    if (isStarter) g.starters.push(row);
    else g.subs.push(row);
    grouped.set(tid, g);
  }
  return [...grouped.values()].map((g) => ({
    team: { id: 0, name: "—", logo: "" }, // team names arrive via `lineups.team` include (plan-gated); left empty defensively
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
    lineups: mapSmLineups(f.lineups ?? []),
    finished: f.state_id === 6 || f.state_id === 7,
  };
}

/* ------------------------------------------------------------------ */
/* Match detail page (fixtures/{id}) — Step 2                          */
/* ------------------------------------------------------------------ */

/**
 * Map a raw SportMonks fixture-detail event into a `MatchDetailEvent`, resolving
 * `side` by comparing `participant_id` to the home/away team ids and classifying
 * Goal/Card/Subst/Var defensively from the event's combined text. Events whose
 * participant resolves to neither side, or that can't be classified into a
 * meaningful type, are skipped (never fabricated).
 */
export function mapMatchDetailEvent(
  e: SMEvent,
  homeId?: number,
  awayId?: number,
): MatchDetailEvent | null {
  if (e.participant_id == null) return null;
  const side = e.participant_id === homeId ? "home" : e.participant_id === awayId ? "away" : null;
  if (!side) return null;
  const label = [e.addition, e.type, e.info, e.reason, e.detail]
    .filter((v): v is string => typeof v === "string" && v.length > 0)
    .join(" ")
    .toLowerCase();
  let type: MatchDetailEvent["type"] | null = null;
  if (/subst|substitution|in play|on for/i.test(label)) type = "Subst";
  else if (/red card|yellow card|(^| )card/i.test(label)) type = "Card";
  else if (/var|video assistant/i.test(label)) type = "Var";
  else if (/goal|penalty scored|own goal|header|shot/i.test(label)) type = "Goal";
  if (!type) return null;
  return {
    minute: e.minute ?? 0,
    extraTime: e.extra_minute,
    side,
    type,
    player: e.player_name ?? "—",
    detail: e.addition ?? e.info ?? e.detail ?? e.reason ?? undefined,
  };
}

/** Coerce a raw stat value into a finite number (default 0). "55%" → 55, null → 0. */
function statNum(v: string | number | null | undefined): number {
  if (v == null) return 0;
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  const n = parseFloat(v.replace(/[^\d.]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

/** Normalize a SportMonks stat code for map lookup (case/punct-insensitive). */
function normStatCode(c?: string): string {
  return (c ?? "").toLowerCase().replace(/[\s_-]/g, "");
}

/** Human display labels for the key stats the owner wants, keyed by normalized
 * `type.code`. Unknown codes fall back to `type.name`, never fabricated. */
const STAT_LABELS: Record<string, string> = {
  shotstotal: "Shots",
  shotsongoal: "Shots on target",
  shotsoffgoal: "Shots off target",
  shotsinsidebox: "Shots inside box",
  shotsoutsidebox: "Shots outside box",
  corners: "Corners",
  fouls: "Fouls",
  ballpossession: "Ball possession",
  possession: "Ball possession",
  possessionpercentage: "Ball possession",
  expectedgoals: "Expected goals (xG)",
  xg: "Expected goals (xG)",
  yellowcards: "Yellow cards",
  redcards: "Red cards",
  offsides: "Offsides",
  substitutions: "Substitutions",
  freekicks: "Free kicks",
  saves: "Saves",
  throwins: "Throw-ins",
  blockedshots: "Blocked shots",
  bigchances: "Big chances",
};

/** Preferred display order for the curated stats; unknown keys sort after these. */
const STAT_ORDER = [
  "ballpossession",
  "shotstotal",
  "shotsongoal",
  "shotsoffgoal",
  "shotsinsidebox",
  "shotsoutsidebox",
  "blockedshots",
  "corners",
  "fouls",
  "yellowcards",
  "redcards",
  "offsides",
  "substitutions",
  "saves",
  "throwins",
  "freekicks",
  "bigchances",
  "expectedgoals",
];

/**
 * Pair flat SportMonks statistics rows into home/away `MatchDetailStat`s. Rows
 * are paired by `type.code` (falling back to `type.name` / `type_id`) and
 * assigned to a side via `location` ("home"|"away").
 */
export function mapSmDetailStatistics(rows: SMStatRow[]): MatchDetailStat[] {
  interface Acc {
    code: string;
    label: string;
    home: number;
    away: number;
    order: number;
  }
  const acc = new Map<string, Acc>();
  for (const row of rows) {
    const code = normStatCode(row.type?.code || row.type?.name);
    const key = code || (row.type_id != null ? `t:${row.type_id}` : "");
    if (!key) continue;
    const label = (code && STAT_LABELS[code]) ?? row.type?.name ?? row.type?.code ?? key;
    let a = acc.get(key);
    if (!a) {
      const order = STAT_ORDER.indexOf(code);
      a = { code, label, home: 0, away: 0, order: order === -1 ? STAT_ORDER.length : order };
      acc.set(key, a);
    }
    const value = statNum(row.data?.value);
    if (row.location === "home") a.home = value;
    else if (row.location === "away") a.away = value;
  }
  return [...acc.values()]
    .sort((x, y) => x.order - y.order)
    .map((a) => ({ key: a.code || a.label, label: a.label, home: a.home, away: a.away }));
}

/** Map one flat lineup row into a `MatchDetailLineupRow`. */
function mapMatchDetailLineupRow(p: SMLineup): MatchDetailLineupRow {
  const pid = p.player?.position_id ?? p.position_id;
  return {
    id: p.player_id ?? p.player?.id ?? 0,
    name: p.player?.name ?? p.player_name ?? "—",
    number: p.jersey_number ?? p.number ?? 0,
    pos: pid != null ? String(pid) : "—",
    grid: p.formation_field,
    photo: p.player?.image_path,
  };
}

/**
 * Derive a formation string (e.g. "4-3-3") from a team's starters. SportMonks'
 * `formation_field` is "line:slot" — line 1 is the goalkeeper, lines 2..N are
 * the field lines from defence to attack, so counting per line (excluding the
 * GK) and joining ascending gives the standard "defenders-midfielders-forwards"
 * shape. Returns "—" when the data can't form a 10-outfield line-up.
 */
function deriveFormation(starters: SMLineup[]): string {
  const byLine = new Map<number, number>();
  for (const s of starters) {
    const n = parseInt((s.formation_field ?? "").split(":")[0]!, 10);
    if (!Number.isFinite(n) || n <= 1) continue; // skip GK line 1 + garbage
    byLine.set(n, (byLine.get(n) ?? 0) + 1);
  }
  const lines = [...byLine.keys()].sort((a, b) => a - b);
  if (!lines.length) return "—";
  const counts = lines.map((l) => byLine.get(l)!);
  const total = counts.reduce((sum, c) => sum + c, 0);
  const contiguous = lines[lines.length - 1]! - lines[0]! + 1 === lines.length;
  if (total !== 10 || !contiguous || counts.some((c) => c <= 0)) return "—";
  return counts.join("-");
}

/** Group flat lineup rows by team into `MatchDetailLineup`s (starters vs subs). */
export function mapSmDetailLineups(
  rows: SMLineup[],
  participants: SMInplayParticipant[],
): MatchDetailLineup[] {
  const teamNames = new Map<number, string>();
  for (const p of participants) if (p.id != null && p.name) teamNames.set(p.id, p.name);
  const byTeam = new Map<number, { starters: SMLineup[]; subs: SMLineup[] }>();
  for (const row of rows) {
    const tid = row.team_id ?? row.participant_id ?? 0;
    if (tid === 0) continue;
    const g = byTeam.get(tid) ?? { starters: [], subs: [] };
    // Prefer type_id (11 = starter, 12 = sub); fall back to formation_position.
    const isStarter =
      row.type_id != null
        ? row.type_id === 11
        : (row.formation_position ?? 0) >= 1 && (row.formation_position ?? 0) <= 11;
    if (isStarter) g.starters.push(row);
    else g.subs.push(row);
    byTeam.set(tid, g);
  }
  return [...byTeam.entries()].map(([tid, g]) => ({
    teamId: tid,
    teamName: teamNames.get(tid) ?? "—",
    formation: deriveFormation(g.starters),
    startXI: g.starters.map(mapMatchDetailLineupRow),
    substitutes: g.subs.map(mapMatchDetailLineupRow),
  }));
}

/**
 * Map a full raw fixture-detail row into the app `MatchDetailPage` consumed by
 * the Step-2 match-detail page (part B). Resolves home/away teams from
 * `participants` by `meta.location`, the current score from CURRENT rows, and
 * status/minute/phase/addedTime from `periods` (shared `deriveInplayPeriod`).
 */
export function mapSmMatchDetailPage(
  fixtureId: number,
  row: SMDetailFixture,
  fallbackNames: [string, string] = smFixtureTeamNames(row.name),
): MatchDetailPage {
  const participants = row.participants ?? [];
  const homeP = participants.find((p) => p.meta?.location === "home");
  const awayP = participants.find((p) => p.meta?.location === "away");
  const [fallbackHome, fallbackAway] = fallbackNames;
  const homeId = homeP?.id;
  const awayId = awayP?.id;

  const homeName = homeP?.name ?? fallbackHome;
  const awayName = awayP?.name ?? fallbackAway;

  // Current score from CURRENT score rows, keyed by score.participant.
  let homeScore = 0;
  let awayScore = 0;
  for (const s of row.scores ?? []) {
    if (s.description !== "CURRENT") continue;
    const side = s.score?.participant;
    const goals = s.score?.goals ?? 0;
    if (side === "home") homeScore = goals;
    else if (side === "away") awayScore = goals;
  }

  const { status, minute, phase, addedTime } = deriveInplayPeriod(row.periods, row.state_id);

  const events = (row.events ?? [])
    .map((e) => mapMatchDetailEvent(e, homeId, awayId))
    .filter((e): e is MatchDetailEvent => e !== null);

  return {
    fixtureId,
    source: "api-football",
    header: {
      league: { name: row.league?.name ?? "—", logo: row.league?.image_path },
      home: { id: homeId ?? 0, name: homeName, logo: homeP?.image_path, score: homeScore },
      away: { id: awayId ?? 0, name: awayName, logo: awayP?.image_path, score: awayScore },
      status,
      minute,
      phase,
      addedTime,
    },
    events,
    stats: mapSmDetailStatistics(row.statistics ?? []),
    lineups: mapSmDetailLineups(row.lineups ?? [], participants),
  };
}

/** Map a raw H2H fixture row into the app `H2HRecord`. Team names come from
 * `participants` (by `meta.location`) when embedded, else `name`; scores from
 * CURRENT score rows when `include=scores`; result from `result_info`. */
export function mapSmH2H(row: SMH2HFixture): H2HRecord {
  const participants = row.participants ?? [];
  const homeP = participants.find((p) => p.meta?.location === "home");
  const awayP = participants.find((p) => p.meta?.location === "away");
  const [nameHome, nameAway] = smFixtureTeamNames(row.name);
  let homeScore: number | undefined;
  let awayScore: number | undefined;
  for (const s of row.scores ?? []) {
    if (s.description !== "CURRENT") continue;
    const side = s.score?.participant;
    if (side === "home") homeScore = s.score?.goals ?? 0;
    else if (side === "away") awayScore = s.score?.goals ?? 0;
  }
  return {
    fixtureId: row.id ?? 0,
    date: (row.starting_at ?? "").slice(0, 10),
    home: homeP?.name ?? nameHome,
    away: awayP?.name ?? nameAway,
    homeScore,
    awayScore,
    result: row.result_info ?? "—",
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
  // Prefer names without middle/second parts; fall back to the full name only
  // when neither normalized field is present.
  return (
    p.common_name ??
    p.display_name ??
    p.name ??
    (`${p.firstname ?? ""} ${p.lastname ?? ""}`.trim() || "—")
  );
}

/**
 * Map a raw SportMonks player into the app `WorldPlayer`. `stats[0]` (the
 * current season's stats row, embedded via `include=stats`) contributes league,
 * club, position and goals where available.
 */
export function mapSmWorldPlayer(
  p: SMPlayer,
  stats?: { team?: SMTeam; league?: SMLeague; position_id?: number; goals?: { total?: number } }[],
): WorldPlayer {
  const s = stats?.[0];
  const birth = p.date_of_birth ? new Date(p.date_of_birth) : null;
  const age =
    birth && !Number.isNaN(birth.getTime())
      ? Math.max(0, Math.floor((Date.now() - birth.getTime()) / (365.25 * 86400_000)))
      : undefined;
  return {
    id: p.id ?? 0,
    name: playerName(p),
    firstname: p.firstname,
    lastname: p.lastname,
    age,
    nationality: p.nationality ?? p.country?.name,
    position: smPositionName({
      position: p.position,
      position_id: s?.position_id ?? p.position_id,
    }),
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
    posId != null ? (posId <= 1 ? "GK" : posId <= 4 ? "DF" : posId <= 6 ? "MF" : "ST") : "CM";
  const core = {
    pac: clampAttr(base + (pos === "DF" ? -2 : 4) + ((hash(seed + "pac") % 13) - 6)),
    sho: clampAttr(base + per90(goals) * 22 - 6),
    pas: clampAttr(base + passAcc * 0.18 + per90(assists) * 6 - 12),
    dri: clampAttr(base + 4),
    def: clampAttr(base + (pos === "DF" ? 8 : pos === "ST" ? -18 : -4)),
    phy: clampAttr(base + (toNum(p.weight) ?? 75) * 0.05 - 2),
  };
  const overall = Math.round((core.pac + core.sho + core.pas + core.dri + core.def + core.phy) / 6);
  const birth = p.date_of_birth ? new Date(p.date_of_birth) : null;
  const age =
    birth && !Number.isNaN(birth.getTime())
      ? Math.max(0, Math.floor((Date.now() - birth.getTime()) / (365.25 * 86400_000)))
      : 0;
  return {
    id: `sm-${p.id}`,
    type: "player",
    name: playerName(p),
    club: season?.team?.name ?? "Free Agent",
    clubBadge: season?.team?.image_path ?? "⚽",
    nation: p.country?.name ?? p.nationality ?? "🌍",
    position: pos,
    positionName: p.position?.name ?? pos,
    flag: p.country?.image_path,
    tier: tierFor(overall),
    core,
    age,
    heightCm: toNum(p.height) ?? 180,
    weightKg: toNum(p.weight) ?? 75,
    // Real season stats (present only when a stats include resolves; otherwise
    // the UI renders the em-dash "B bridge" placeholder).
    goals: goals || undefined,
    assists: assists || undefined,
    appearances: season?.games?.appearences || undefined,
    foot: hash(seed) % 4 === 0 ? "left" : "right",
    marketValue: "—",
    contractUntil: "—",
    injuries: null,
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
  extra?: {
    country?: string | undefined;
    founded?: number | undefined;
    venue_name?: string | undefined;
    venue_city?: string | undefined;
    venue_capacity?: number | undefined;
  },
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
      age: p.date_of_birth
        ? Math.max(
            0,
            Math.floor((Date.now() - new Date(p.date_of_birth).getTime()) / (365.25 * 86400_000)),
          )
        : undefined,
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
