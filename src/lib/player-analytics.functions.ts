/**
 * Server data layer + form (Hot/Cold) engine for the Player Analytics Modal.
 *
 * Fetches a player's per-season aggregate statistics and their recent lineups in
 * a single SportMonks call (falling back to two merged calls when the combined
 * include set is rejected) and normalizes them into a provider-agnostic
 * `PlayerAnalytics` shape plus a deterministic `computeForm` bonus that the
 * squad builder can later use as a rating +/- adjustment.
 *
 * Honest-by-construction:
 *  - Only statistics rows with `has_values === true` are surfaced.
 *  - There is NO per-match micro-stat (per-match rating/goals/pass%) on this
 *    plan, so "form" is derived from real season aggregates + recent match
 *    RESULTS (win/draw/loss from `fixture.scores`) — never fabricated.
 *  - Missing inputs degrade to `neutral` / `0` rather than being invented.
 */

import { createServerFn } from "@tanstack/react-start";
import { TTL } from "@/lib/freshness-config";
import { sportMonks, sportMonksCached, type SportMonksEnvelope } from "@/lib/api-sportmonks.server";
import type { SMInplayScore, SMLineup, SMPlayerStats, SMStatDetail, SMStatValue } from "@/lib/sportmonks.mappers";

/* ------------------------------------------------------------------ */
/* Typed normalized shapes                                             */
/* ------------------------------------------------------------------ */

export type SeasonStatRow = {
  /** Season label as returned by SportMonks (e.g. "2024/2025", "2025"). */
  season: string;
  /** SportMonks league id. The league *name* is not embedded by this plan's
   * `statistics.season` include, so it stays null until a later phase adds it. */
  leagueId: number | null;
  /** League display name (null — not derivable from the season include alone). */
  league: string | null;
  appearances: number;
  goals: number;
  assists: number;
  minutesPlayed: number;
  /** Season average rating (0–10), null when the Rating metric is absent. */
  avgRating: number | null;
  /** Goals + assists per 90 minutes, null when minutes are unknown (0). */
  gaPer90: number | null;
};

export type CareerTotals = {
  apps: number;
  goals: number;
  assists: number;
  minutes: number;
  /** Highest single-season average rating across all valued seasons. */
  bestAvgRating: number | null;
};

export type MatchResult = "W" | "D" | "L";

export type RecentMatch = {
  fixtureId: number;
  /** Kickoff date (YYYY-MM-DD). */
  date: string | null;
  /** Fixture display name "Home vs Away". */
  name: string | null;
  /** Opponent team name (best-effort from the fixture name + the player's side). */
  opponent: string | null;
  /** Win/Draw/Loss from the player's team perspective; null when no final score. */
  result: MatchResult | null;
  /** Participation hint: "Started" (starting XI) / "Sub" (substitute); null unknown.
   * Per-match minutes are not available on this plan, so this is the honest signal. */
  minutesHint: string | null;
};

export type FormStatus = "hot" | "cold" | "neutral";

export type FormResult = { status: FormStatus; score: number };

export type PlayerAnalytics = {
  seasons: SeasonStatRow[];
  career: CareerTotals | null;
  recentMatches: RecentMatch[];
  form: FormResult;
  /** false when the player has no valued statistics AND no lineups. */
  hasData: boolean;
};

/* ------------------------------------------------------------------ */
/* Form engine (pure, deterministic, unit-testable)                    */
/* ------------------------------------------------------------------ */

export type FormInput = {
  /** Last-5 match results (most recent first); null entries = unknown. */
  results: (MatchResult | null)[];
  /** Season average rating (0–10), null when unknown. */
  avgRating: number | null;
  /** Recent-season goals + assists per 90 minutes, null when unknown. */
  gaPer90: number | null;
};

const clampScore = (n: number): number => Math.max(-3, Math.min(3, n));

/**
 * Deterministic Hot/Cold form bonus.
 *
 * `score` is a small signed integer in [-3, +3] built from three independent
 * signals, each capped so no single signal can dominate the output:
 *
 *   1. Results — the sum of (win = +1, draw = 0, loss = -1) over the last 5
 *      matches, itself clamped to [-3, +3]. A 5-game win streak is +3, a
 *      5-game losing streak is -3, mixed form sits in between.
 *   2. Rating — the recent season's average rating: >= 7.5 pushes hot (+1),
 *      <= 6.4 pushes cold (-1), otherwise neutral (0).
 *   3. Contribution — a per-90 goals+assists nudge: >= 0.6 contributes +1.
 *      This is deliberately one-directional (never negative) so defenders and
 *      goalkeepers aren't punished for a naturally low GA/90.
 *
 * `status` thresholds: score >= +2 → "hot", score <= -2 → "cold", else "neutral".
 * Missing inputs are treated as 0/unknown so the result falls to "neutral".
 */
export function computeForm(input: FormInput): FormResult {
  const resultSignal = clampScore(
    (input.results ?? []).reduce((sum, r) => sum + (r === "W" ? 1 : r === "L" ? -1 : 0), 0),
  );
  const rating = input.avgRating;
  const ratingSignal =
    rating == null ? 0 : rating >= 7.5 ? 1 : rating <= 6.4 ? -1 : 0;
  const gaSignal = input.gaPer90 != null && input.gaPer90 >= 0.6 ? 1 : 0;

  const score = clampScore(resultSignal + ratingSignal + gaSignal);
  const status: FormStatus = score >= 2 ? "hot" : score <= -2 ? "cold" : "neutral";
  return { status, score };
}

/* ------------------------------------------------------------------ */
/* Normalization                                                       */
/* ------------------------------------------------------------------ */

function num(v: unknown): number | null {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v === "string") {
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function statTotal(value: SMStatValue | undefined): number | null {
  return num(value?.total);
}

function findDetail(details: SMStatDetail[] | undefined, name: string): SMStatDetail | undefined {
  return (details ?? []).find((d) => d.type?.name === name);
}

/** Build one season row from a valued `SMPlayerStats` entry. */
function mapSeasonRow(entry: SMPlayerStats): SeasonStatRow {
  const season = entry.season;
  const goals = statTotal(findDetail(entry.details, "Goals")?.value) ?? 0;
  const assists = statTotal(findDetail(entry.details, "Assists")?.value) ?? 0;
  const appearances = statTotal(findDetail(entry.details, "Appearances")?.value) ?? 0;
  const minutesPlayed = statTotal(findDetail(entry.details, "Minutes Played")?.value) ?? 0;
  const avgRating = num(findDetail(entry.details, "Rating")?.value?.average);
  const gaPer90 = minutesPlayed > 0 ? ((goals + assists) / minutesPlayed) * 90 : null;

  return {
    season: season?.name ?? String(entry.season_id ?? "—"),
    leagueId: season?.league_id ?? null,
    league: null,
    appearances,
    goals,
    assists,
    minutesPlayed,
    avgRating,
    gaPer90,
  };
}

function mapCareer(rows: SeasonStatRow[]): CareerTotals | null {
  if (!rows.length) return null;
  return {
    apps: rows.reduce((sum, r) => sum + r.appearances, 0),
    goals: rows.reduce((sum, r) => sum + r.goals, 0),
    assists: rows.reduce((sum, r) => sum + r.assists, 0),
    minutes: rows.reduce((sum, r) => sum + r.minutesPlayed, 0),
    bestAvgRating: rows.reduce<number | null>((best, r) => {
      if (r.avgRating == null) return best;
      return best == null || r.avgRating > best ? r.avgRating : best;
    }, null),
  };
}

/** Resolve which side ("home"|"away") the lineup's team is on, from the fixture
 * score rows (each row pairs `participant_id` with `score.participant`). */
function lineupSide(scores: SMInplayScore[] | undefined, teamId: number | undefined): "home" | "away" | null {
  if (teamId == null) return null;
  for (const s of scores ?? []) {
    if (s.participant_id === teamId && (s.score?.participant === "home" || s.score?.participant === "away")) {
      return s.score.participant;
    }
  }
  return null;
}

/** Final goals for a side, from the "CURRENT" score rows (one per participant). */
function finalGoals(scores: SMInplayScore[] | undefined, side: "home" | "away"): number | null {
  for (const s of scores ?? []) {
    if (s.description === "CURRENT" && s.score?.participant === side) {
      const goals = s.score?.goals;
      if (typeof goals === "number" && Number.isFinite(goals)) return goals;
    }
  }
  return null;
}

function matchResult(lineup: SMLineup): MatchResult | null {
  const scores = lineup.fixture?.scores;
  const side = lineupSide(scores, lineup.team_id);
  if (!side) return null;
  const mine = finalGoals(scores, side);
  const theirs = finalGoals(scores, side === "home" ? "away" : "home");
  if (mine == null || theirs == null) return null;
  return mine > theirs ? "W" : mine < theirs ? "L" : "D";
}

function opponentName(name: string | null | undefined, side: "home" | "away" | null): string | null {
  if (!name || !side) return null;
  const marker = name.toLowerCase().indexOf(" vs ");
  if (marker <= 0) return null;
  const home = name.slice(0, marker).trim();
  const away = name.slice(marker + 4).trim();
  return side === "home" ? away : home;
}

function participationHint(typeId: number | undefined): string | null {
  if (typeId === 11) return "Started";
  if (typeId === 12) return "Sub";
  return null;
}

/** Last 5 appearances (most recent first), each with a result + participation hint. */
function mapRecentMatches(lineups: SMLineup[]): RecentMatch[] {
  return [...(lineups ?? [])]
    .sort((a, b) => (b.fixture?.starting_at ?? "").localeCompare(a.fixture?.starting_at ?? ""))
    .slice(0, 5)
    .map((l) => {
      const side = lineupSide(l.fixture?.scores, l.team_id);
      return {
        fixtureId: l.fixture?.id ?? 0,
        date: (l.fixture?.starting_at ?? "").slice(0, 10) || null,
        name: l.fixture?.name ?? null,
        opponent: opponentName(l.fixture?.name, side),
        result: matchResult(l),
        minutesHint: participationHint(l.type_id),
      };
    });
}

/** The most recent valued season (prefers the current season), used for the
 * form engine's "recent rating" + "recent GA/90" signals. */
function primaryEntry(entries: SMPlayerStats[]): SMPlayerStats | undefined {
  const current = entries.find((e) => e.season?.is_current === true);
  if (current) return current;
  return [...entries].sort((a, b) =>
    (b.season?.starting_at ?? "").localeCompare(a.season?.starting_at ?? ""),
  )[0];
}

type AnalyticsPayload = { statistics: SMPlayerStats[]; lineups: SMLineup[] };

function normalizeAnalytics(payload: AnalyticsPayload): PlayerAnalytics {
  const valued = (payload.statistics ?? []).filter((e) => e.has_values === true);
  // Most recent season first (by season start date).
  valued.sort((a, b) => (b.season?.starting_at ?? "").localeCompare(a.season?.starting_at ?? ""));

  const seasons = valued.map(mapSeasonRow);
  const career = mapCareer(seasons);
  const recentMatches = mapRecentMatches(payload.lineups ?? []);

  const primary = primaryEntry(valued);
  const goals = primary ? statTotal(findDetail(primary.details, "Goals")?.value) ?? 0 : 0;
  const assists = primary ? statTotal(findDetail(primary.details, "Assists")?.value) ?? 0 : 0;
  const minutes = primary ? statTotal(findDetail(primary.details, "Minutes Played")?.value) ?? 0 : 0;
  const avgRating = primary ? num(findDetail(primary.details, "Rating")?.value?.average) : null;
  const gaPer90 = minutes > 0 ? ((goals + assists) / minutes) * 90 : null;

  const form = computeForm({
    results: recentMatches.map((m) => m.result),
    avgRating,
    gaPer90,
  });

  const hasData = seasons.length > 0 || recentMatches.length > 0;
  return { seasons, career, recentMatches, form, hasData };
}

function emptyAnalytics(): PlayerAnalytics {
  return {
    seasons: [],
    career: null,
    recentMatches: [],
    form: { status: "neutral", score: 0 },
    hasData: false,
  };
}

/* ------------------------------------------------------------------ */
/* Fetching                                                            */
/* ------------------------------------------------------------------ */

const COMBINED_INCLUDES = ["statistics.details.type", "statistics.season", "lineups.fixture.scores"];

/**
 * Fetch the player's statistics + lineups. Prefers a single combined request;
 * if SportMonks rejects the combined include set (returns null), falls back to
 * two separate requests and merges them.
 */
async function fetchAnalyticsPayload(playerId: number): Promise<AnalyticsPayload | null> {
  const combined = await sportMonks<SportMonksEnvelope<AnalyticsPayload>>({
    path: `/players/${playerId}`,
    include: COMBINED_INCLUDES,
  });
  if (combined?.data) {
    return { statistics: combined.data.statistics ?? [], lineups: combined.data.lineups ?? [] };
  }

  const stats = await sportMonks<SportMonksEnvelope<{ statistics: SMPlayerStats[] }>>({
    path: `/players/${playerId}`,
    include: ["statistics.details.type", "statistics.season"],
  });
  const lineups = await sportMonks<SportMonksEnvelope<{ lineups: SMLineup[] }>>({
    path: `/players/${playerId}`,
    include: ["lineups.fixture.scores"],
  });
  if (!stats?.data && !lineups?.data) return null;
  return {
    statistics: stats?.data?.statistics ?? [],
    lineups: lineups?.data?.lineups ?? [],
  };
}

/* ------------------------------------------------------------------ */
/* Server function                                                     */
/* ------------------------------------------------------------------ */

/**
 * Full player analytics for the Player Analytics Modal. Returns a structured
 * empty result (rather than throwing) when the player has no valued statistics
 * and no lineups, so the UI can render the "İstatistik Bulunamadı" fallback.
 */
export const getPlayerAnalytics = createServerFn({ method: "GET" })
  .inputValidator((input: { playerId: number }) => input)
  .handler(async ({ data }): Promise<PlayerAnalytics> => {
    return sportMonksCached<PlayerAnalytics>(
      `player-analytics:${data.playerId}`,
      TTL.PLAYER_ANALYTICS,
      async () => {
        const payload = await fetchAnalyticsPayload(data.playerId);
        if (!payload) return null;
        return normalizeAnalytics(payload);
      },
      emptyAnalytics(),
    );
  });
