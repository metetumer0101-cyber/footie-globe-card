/**
 * Server-only durable layer for football data.
 *
 * Successful SportMonks responses are mirrored into normal tables so finished
 * matches and tables survive cache expiry and quota exhaustion. Reads fall back
 * to these tables before the mock data.
 *
 * NOTE (Step 4 cleanup): the `match_events`, `match_stats` and `injuries`
 * tables + their `persistMatchDetails`/`readMatchDetailsDb`/`persistInjuries`/
 * `readInjuriesDb` functions were removed here because the underlying product
 * features were plan-gated on SportMonks (no injuries route, and finished-match
 * details are served from the `sm:` cache). The tables remain in the schema for
 * future revival — see supabase/migrations/20260824001000_cron_config.sql docs.
 */

import { publicDb } from "@/lib/public-db.server";
import type { Standings } from "@/lib/football-data.functions";

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
