/**
 * Server-only durable layer for football data.
 *
 * Successful API-Football responses are mirrored into normal tables
 * (standings, match_events, match_stats, injuries) so finished matches and
 * tables survive cache expiry and quota exhaustion. Reads fall back to these
 * tables before the mock data.
 */

import { publicDb } from "@/lib/public-db.server";
import type { Injury, MatchDetails, MatchEvent, MatchStat, Standings } from "@/lib/football-data.functions";

async function adminDb() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

/* ---------------- Standings ---------------- */

export async function persistStandings(s: Standings): Promise<void> {
  try {
    const db = await adminDb();
    await db.from("standings").delete().eq("league_id", s.leagueId).eq("season", s.season);
    if (!s.rows.length) return;
    const { error } = await db.from("standings").insert(
      s.rows.map((r) => ({
        league_id: s.leagueId,
        season: s.season,
        team_id: r.team.id,
        team_name: r.team.name,
        rank: r.rank,
        points: r.points,
        played: r.played,
        wins: r.wins,
        draws: r.draws,
        losses: r.losses,
        goals_for: r.goalsFor,
        goals_against: r.goalsAgainst,
        goal_diff: r.goalDiff,
        form: r.form || null,
        logo: r.team.logo || null,
      })),
    );
    if (error) console.error("[football-data] persist standings failed", error.message);
  } catch {
    /* persistence is best-effort */
  }
}

export async function readStandingsDb(
  leagueId: number,
  season: number,
  leagueName: string,
): Promise<Standings | null> {
  try {
    const { data, error } = await publicDb()
      .from("standings")
      .select("*")
      .eq("league_id", leagueId)
      .eq("season", season)
      .order("rank", { ascending: true });
    if (error || !data?.length) return null;
    return {
      leagueId,
      season,
      leagueName,
      logo: "",
      source: "api-football",
      rows: data.map((r) => ({
        rank: r.rank,
        team: { id: r.team_id, name: r.team_name, logo: r.logo ?? "" },
        points: r.points,
        played: r.played,
        wins: r.wins,
        draws: r.draws,
        losses: r.losses,
        goalsFor: r.goals_for,
        goalsAgainst: r.goals_against,
        goalDiff: r.goal_diff,
        form: r.form ?? "",
      })),
    };
  } catch {
    return null;
  }
}

/* ---------------- Match details (finished matches are permanent) ---------------- */

export async function persistMatchDetails(d: MatchDetails): Promise<void> {
  try {
    const db = await adminDb();
    await Promise.all([
      db.from("match_events").delete().eq("fixture_id", d.fixtureId),
      db.from("match_stats").delete().eq("fixture_id", d.fixtureId),
    ]);

    if (d.events.length) {
      const { error } = await db.from("match_events").insert(
        d.events.map((e: MatchEvent) => ({
          fixture_id: d.fixtureId,
          elapsed: e.elapsed,
          extra_time: e.extraTime ?? null,
          team_id: e.team.id,
          team_name: e.team.name,
          player_id: e.player.id || null,
          player_name: e.player.name,
          assist_id: e.assist?.id ?? null,
          assist_name: e.assist?.name ?? null,
          type: e.type,
          detail: e.detail || null,
          comments: e.comments ?? null,
        })),
      );
      if (error) console.error("[football-data] persist events failed", error.message);
    }

    if (d.stats.length) {
      const { error } = await db.from("match_stats").insert(
        d.stats.map((s: MatchStat) => ({
          fixture_id: d.fixtureId,
          team_id: 0,
          team_name: null,
          stat_type: s.type,
          home_value: s.home,
          away_value: s.away,
        })),
      );
      if (error) console.error("[football-data] persist stats failed", error.message);
    }
  } catch {
    /* persistence is best-effort */
  }
}

export async function readMatchDetailsDb(fixtureId: number): Promise<MatchDetails | null> {
  try {
    const db = publicDb();
    const [eventsRes, statsRes] = await Promise.all([
      db.from("match_events").select("*").eq("fixture_id", fixtureId).order("elapsed"),
      db.from("match_stats").select("*").eq("fixture_id", fixtureId),
    ]);
    const events = eventsRes.data ?? [];
    const stats = statsRes.data ?? [];
    if (!events.length && !stats.length) return null;
    return {
      fixtureId,
      source: "api-football",
      finished: true,
      events: events.map((e) => ({
        elapsed: e.elapsed ?? 0,
        extraTime: e.extra_time ?? undefined,
        team: { id: e.team_id ?? 0, name: e.team_name ?? "—" },
        player: { id: e.player_id ?? 0, name: e.player_name ?? "—" },
        assist: e.assist_id ? { id: e.assist_id, name: e.assist_name ?? undefined } : undefined,
        type: e.type,
        detail: e.detail ?? "",
        comments: e.comments ?? undefined,
      })),
      stats: stats.map((s) => ({
        type: s.stat_type,
        home: s.home_value ?? "",
        away: s.away_value ?? "",
      })),
      lineups: [],
    };
  } catch {
    return null;
  }
}

/* ---------------- Injuries ---------------- */

export async function persistInjuries(teamId: number, rows: Injury[]): Promise<void> {
  try {
    const db = await adminDb();
    await db.from("injuries").delete().eq("team_id", teamId);
    if (!rows.length) return;
    const { error } = await db.from("injuries").insert(
      rows.map((r) => ({
        player_id: r.player.id || null,
        player_name: r.player.name,
        team_id: r.team.id,
        team_name: r.team.name,
        fixture_id: r.fixture?.id ?? null,
        fixture_date: r.fixture?.date ?? null,
        type: r.type ?? null,
        reason: r.reason ?? null,
        status: r.status ?? null,
      })),
    );
    if (error) console.error("[football-data] persist injuries failed", error.message);
  } catch {
    /* persistence is best-effort */
  }
}

export async function readInjuriesDb(teamId: number): Promise<Injury[] | null> {
  try {
    const { data, error } = await publicDb()
      .from("injuries")
      .select("*")
      .eq("team_id", teamId)
      .order("updated_at", { ascending: false });
    if (error || !data?.length) return null;
    return data.map((r) => ({
      player: { id: r.player_id ?? 0, name: r.player_name ?? "—" },
      team: { id: r.team_id ?? teamId, name: r.team_name ?? "—" },
      fixture: r.fixture_id ? { id: r.fixture_id, date: r.fixture_date ?? undefined } : undefined,
      type: r.type ?? undefined,
      reason: r.reason ?? undefined,
      status: r.status ?? undefined,
    }));
  } catch {
    return null;
  }
}
