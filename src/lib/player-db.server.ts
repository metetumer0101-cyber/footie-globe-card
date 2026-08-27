/**
 * Server-only world-player database layer.
 *
 * FootCard keeps its own copy in the `world_players` table (SportMonks ids),
 * refreshed league-by-league (nightly via the cron route, or on demand from the
 * admin panel). Search and browse then read from the local table — instant and
 * quota-free — with the live API as fallback for anything not synced yet.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { sportMonks, type SportMonksList } from "@/lib/api-sportmonks.server";
import { smPositionName, type SMPlayer } from "@/lib/sportmonks.mappers";
import { publicDb } from "@/lib/public-db.server";
import type { WorldPlayer, WorldSearchResult } from "@/lib/player-search.functions";

/**
 * Leagues mirrored into `world_players`. Cups first: a player appears in both
 * their cup and domestic league, and the domestic row (written later) wins
 * the upsert, which keeps league stats as the canonical season numbers.
 */
export const SYNC_LEAGUES: { id: number; name: string }[] = [
  { id: 2, name: "UEFA Champions League" },
  { id: 3, name: "UEFA Europa League" },
  { id: 848, name: "UEFA Conference League" },
  { id: 39, name: "Premier League" },
  { id: 140, name: "La Liga" },
  { id: 135, name: "Serie A" },
  { id: 78, name: "Bundesliga" },
  { id: 61, name: "Ligue 1" },
  { id: 203, name: "Süper Lig" },
  { id: 88, name: "Eredivisie" },
  { id: 94, name: "Primeira Liga" },
  { id: 144, name: "Belgian Pro League" },
  { id: 40, name: "Championship" },
  { id: 141, name: "La Liga 2" },
  { id: 136, name: "Serie B" },
  { id: 62, name: "Ligue 2" },
  { id: 204, name: "TFF 1. Lig" },
  { id: 179, name: "Scottish Premiership" },
  { id: 218, name: "Austrian Bundesliga" },
  { id: 207, name: "Swiss Super League" },
  { id: 197, name: "Greek Super League" },
  { id: 119, name: "Danish Superliga" },
  { id: 103, name: "Norwegian Eliteserien" },
  { id: 113, name: "Swedish Allsvenskan" },
  { id: 106, name: "Polish Ekstraklasa" },
  { id: 345, name: "Czech Liga" },
  { id: 210, name: "Croatian HNL" },
  { id: 71, name: "Brazil Serie A" },
  { id: 128, name: "Argentina Liga Profesional" },
  { id: 253, name: "MLS" },
  { id: 262, name: "Liga MX" },
  { id: 307, name: "Saudi Pro League" },
  { id: 98, name: "J1 League" },
  { id: 292, name: "K League 1" },
  { id: 188, name: "A-League" },
];

const PAGE_DELAY_MS = 110;
export const SEARCH_PAGE_SIZE = 20;

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

function num(raw?: string | number | null): number | undefined {
  if (raw == null) return undefined;
  const parsed = parseInt(String(raw), 10);
  return Number.isFinite(parsed) ? parsed : undefined;
}

type WorldPlayerInsert = Database["public"]["Tables"]["world_players"]["Insert"];

export type LeagueSyncResult = {
  leagueId: number;
  season: number;
  pages: number;
  upserted: number;
};

/* ------------------------------------------------------------------ */
/* SportMonks mirror via the SSOT client                               */
/* ------------------------------------------------------------------ */

/**
 * API-Football -> SportMonks league id for leagues verified against the real
 * token (`/leagues/search/{name}`). Unmapped leagues resolve by name at runtime
 * so the whole SYNC_LEAGUES list keeps working; this map removes ambiguity for
 * the common ones.
 */
const SM_LEAGUE_IDS: Record<number, number> = {
  39: 8, // Premier League
  203: 600, // Süper Lig
  179: 501, // Scottish Premiership
  140: 564, // La Liga
  135: 384, // Serie A (Italy — the other "Serie A" is country 5)
  78: 82, // Bundesliga
  61: 301, // Ligue 1
};

type SMLgRef = { id?: number; name?: string };

async function resolveSmLeagueId(afLeagueId: number, name: string): Promise<number | null> {
  const known = SM_LEAGUE_IDS[afLeagueId];
  if (known) return known;
  const list = await sportMonks<{ data?: SMLgRef[] }>({
    path: `/leagues/search/${encodeURIComponent(name)}`,
  });
  const exact = list?.data?.find((l) => l.name?.toLowerCase() === name.toLowerCase());
  return exact?.id ?? list?.data?.[0]?.id ?? null;
}

/** Extract a calendar start-year from a SportMonks season name like "2026/2027". */
function smSeasonYear(name?: string): number {
  const m = /(20\d{2})/.exec(name ?? "");
  const year = m?.[1];
  return year ? parseInt(year, 10) : 0;
}

type SMTeamRef = { id?: number; name?: string };

async function upsertSmPage(
  db: SupabaseClient<Database>,
  players: SMPlayer[],
  team: SMTeamRef,
  leagueName: string,
  leagueId: number,
  season: number,
): Promise<number> {
  const payload: WorldPlayerInsert[] = players
    .filter((p) => p.id)
    .map((p) => {
      const birth = p.date_of_birth ? new Date(p.date_of_birth) : null;
      const pAge =
        birth && !Number.isNaN(birth.getTime())
          ? Math.max(0, Math.floor((Date.now() - birth.getTime()) / (365.25 * 86400_000)))
          : null;
      return {
        api_id: null,
        sportmonks_id: p.id as number,
        provider: "sportmonks",
        name: (p.name ?? `${p.firstname ?? ""} ${p.lastname ?? ""}`.trim()) || "—",
        firstname: p.firstname ?? null,
        lastname: p.lastname ?? null,
        age: pAge,
        nationality:
          (typeof p.nationality === "string" ? p.nationality : p.nationality?.name) ??
          p.country?.name ??
          null,
        position: smPositionName(p) ?? null,
        photo: p.image_path ?? null,
        club: team.name ?? null,
        club_id: team.id ?? null,
        league: leagueName,
        league_id: leagueId,
        season,
        height_cm: typeof p.height === "number" ? p.height : num(String(p.height)) ?? null,
        weight_kg: typeof p.weight === "number" ? p.weight : num(String(p.weight)) ?? null,
        injured: false,
        updated_at: new Date().toISOString(),
      } satisfies WorldPlayerInsert;
    });
  if (!payload.length) return 0;
  const { error } = await db.from("world_players").upsert(payload, {
    onConflict: "sportmonks_id",
    ignoreDuplicates: false,
  });
  if (error) {
    console.error(`[player-db] SM upsert failed (league ${leagueId})`, error.message);
    return 0;
  }
  return payload.length;
}

/** A current-season record from `/leagues/{id}?include=seasons`. */
type SMSeason = { id?: number; name?: string; is_current?: boolean };

/**
 * A membership row from `/teams/{id}?include=players.player...`. The `players`
 * include is a flat array of squad/transfer memberships, each carrying its own
 * `position_id` and a nested `player` object with the actual bio fields.
 * `nationality`/`country` arrive as nested `{ name }` objects (not strings).
 */
type SMPlayerMember = {
  position_id?: number;
  player?: {
    id?: number;
    name?: string;
    firstname?: string;
    lastname?: string;
    image_path?: string;
    date_of_birth?: string;
    height?: number | string | null;
    weight?: number | string | null;
    position_id?: number;
    position?: { id?: number; name?: string } | null;
    nationality?: string | { name?: string } | null;
    country?: { id?: number; name?: string } | null;
  } | null;
};

function memberToSmPlayer(m: SMPlayerMember): SMPlayer | null {
  const p = m.player;
  if (!p?.id) return null;
  const nationality =
    typeof p.nationality === "string" ? p.nationality : (p.nationality as { name?: string } | null)?.name;
  const countryName = (p.country as { name?: string } | null)?.name ?? null;
  const countryId = (p.country as { id?: number } | null)?.id;
  return {
    id: p.id,
    name: p.name,
    firstname: p.firstname,
    lastname: p.lastname,
    image_path: p.image_path,
    date_of_birth: p.date_of_birth,
    height: p.height,
    weight: p.weight,
    position_id: m.position_id ?? p.position_id,
    position: p.position ?? null,
    nationality: nationality ?? countryName ?? undefined,
    country: countryName ? { name: countryName, ...(countryId != null ? { id: countryId } : {}) } : null,
  };
}

/** Mirror one league from SportMonks: league -> seasons -> teams -> players. */
async function syncLeaguePlayersSm(
  afLeagueId: number,
  leagueName: string,
): Promise<LeagueSyncResult | null> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const smLeagueId = await resolveSmLeagueId(afLeagueId, leagueName);
  if (!smLeagueId) return null;

  // SportMonks v3 puts a resource's related entities in a FLAT array on the
  // parent (`data.seasons`), not wrapped in a `{ data: [...] }` envelope.
  const seasons = await sportMonks<{ data?: { seasons?: SMSeason[] } }>({
    path: `/leagues/${smLeagueId}?include=seasons`,
  });
  const seasonList = seasons?.data?.seasons ?? [];
  const chosen = seasonList.find((s) => s.is_current) ?? seasonList[0];
  if (!chosen?.id) return null;
  const seasonYear = smSeasonYear(chosen.name) || afLeagueId;

  const teamsRes = await sportMonks<{ data?: { teams?: SMTeamRef[] } }>({
    path: `/seasons/${chosen.id}?include=teams`,
  });
  const teams = teamsRes?.data?.teams ?? [];
  if (!teams.length) return null;

  let upserted = 0;
  for (const team of teams) {
    // `players` returns memberships, so we need the nested `player` (+ its
    // nationality/country names) to get real bio data for the upsert.
    const sq = await sportMonks<{ data?: { players?: SMPlayerMember[] } }>({
      path: `/teams/${team.id}?include=players.player.nationality;players.player.country;players.player.position`,
    });
    const players = (sq?.data?.players ?? [])
      .map(memberToSmPlayer)
      .filter((p): p is SMPlayer => Boolean(p));
    if (players.length)
      upserted += await upsertSmPage(
        supabaseAdmin,
        players,
        team,
        leagueName,
        afLeagueId,
        seasonYear,
      );
    await delay(Math.min(PAGE_DELAY_MS, 60));
  }
  return { leagueId: afLeagueId, season: seasonYear, pages: teams.length, upserted };
}

/**
 * Mirror every player of one league into `world_players` from SportMonks.
 * `apiKey` is kept for call-site compatibility (the cron/admin pass the token)
 * but is no longer branched on — SportMonks is the only provider.
 * Returns null when the league has no data in any reachable season.
 */
export async function syncLeaguePlayers(
  leagueId: number,
  apiKey: string,
): Promise<LeagueSyncResult | null> {
  void apiKey;
  const leagueName = SYNC_LEAGUES.find((l) => l.id === leagueId)?.name ?? `League ${leagueId}`;
  return syncLeaguePlayersSm(leagueId, leagueName);
}

type WorldPlayerRow = Database["public"]["Tables"]["world_players"]["Row"];

function rowToWorldPlayer(row: WorldPlayerRow): WorldPlayer {
  return {
    id: row.api_id ?? row.sportmonks_id ?? 0,
    name: row.name,
    firstname: row.firstname ?? undefined,
    lastname: row.lastname ?? undefined,
    age: row.age ?? undefined,
    nationality: row.nationality ?? undefined,
    position: row.position ?? undefined,
    photo: row.photo ?? undefined,
    heightCm: row.height_cm ?? undefined,
    weightKg: row.weight_kg ?? undefined,
    club: row.club ?? undefined,
    league: row.league ?? undefined,
    goals: row.goals ?? undefined,
  };
}

/**
 * Search the local mirror. Returns null when the table has no matches on
 * page 1 (caller then falls back to the live API); empty pages beyond 1 mean
 * the result set is exhausted and are returned as-is so paging stops.
 */
export async function searchWorldPlayersDb(opts: {
  query: string;
  page: number;
  leagueId?: number | null;
}): Promise<WorldSearchResult | null> {
  try {
    const escaped = opts.query.replace(/[%_\\]/g, "\\$&");
    let q = publicDb()
      .from("world_players")
      .select("*", { count: "exact" })
      .ilike("name", `%${escaped}%`);
    if (opts.leagueId) q = q.eq("league_id", opts.leagueId);
    const from = (opts.page - 1) * SEARCH_PAGE_SIZE;
    const { data, count, error } = await q
      .order("rating", { ascending: false, nullsFirst: false })
      .order("name")
      .range(from, from + SEARCH_PAGE_SIZE - 1);
    if (error || !data) return null;
    if (!data.length && opts.page === 1) return null;
    return {
      players: data.map(rowToWorldPlayer),
      paging: {
        current: opts.page,
        total: Math.max(1, Math.ceil((count ?? data.length) / SEARCH_PAGE_SIZE)),
      },
      source: "database",
    };
  } catch {
    return null;
  }
}

/**
 * Real season stats for a SportMonks player id from the local mirror.
 * The `goals`/`assists`/`appearances` columns exist but the current sync does
 * not populate them (numeric season stats are plan-gated). Returns undefined
 * values when absent so the UI renders the em-dash "B bridge" placeholder —
 * never a fabricated zero.
 */
export async function playerSeasonStatsDb(smId: number): Promise<{
  goals?: number | undefined;
  assists?: number | undefined;
  appearances?: number | undefined;
} | null> {
  try {
    const { data, error } = await publicDb()
      .from("world_players")
      .select("goals, assists, appearances")
      .or(`sportmonks_id.eq.${smId},api_id.eq.${smId}`)
      .limit(1);
    if (error || !data?.[0]) return null;
    const row = data[0];
    return {
      goals: row.goals ?? undefined,
      assists: row.assists ?? undefined,
      appearances: row.appearances ?? undefined,
    };
  } catch {
    return null;
  }
}

/**
 * A broad, position-diverse pool of real players for Squad Builder auto-fill.
 * Reads the local `world_players` mirror (quota-free) and returns a generous
 * mix across all four coarse buckets so any formation can be filled. Callers
 * normalise `position` (names like "Goalkeeper" or raw ids "24".."27") to a
 * coarse code before placement.
 */
export async function worldPlayerPoolDb(): Promise<
  {
    smId: number;
    name: string;
    position: string | null;
    club?: string | null;
    nationality?: string | null;
    photo?: string | null;
    rating?: number | null;
  }[]
> {
  try {
    const { data, error } = await publicDb()
      .from("world_players")
      .select("sportmonks_id, name, position, club, nationality, photo, rating")
      .order("rating", { ascending: false, nullsFirst: false })
      .limit(400);
    if (error || !data?.length) return [];
    const seen = new Set<number>();
    const out: {
      smId: number;
      name: string;
      position: string | null;
      club?: string | null;
      nationality?: string | null;
      photo?: string | null;
      rating?: number | null;
    }[] = [];
    for (const r of data) {
      if (r.sportmonks_id == null || seen.has(r.sportmonks_id)) continue;
      seen.add(r.sportmonks_id);
      out.push({
        smId: r.sportmonks_id,
        name: r.name,
        position: r.position ?? null,
        club: r.club ?? null,
        nationality: r.nationality ?? null,
        photo: r.photo ?? null,
        rating: r.rating ?? null,
      });
    }
    return out;
  } catch {
    return [];
  }
}

/** Top scorers of a league from the local mirror (null when not synced). */
export async function leagueTopPlayersDb(leagueId: number): Promise<WorldSearchResult | null> {
  try {
    const { data, error } = await publicDb()
      .from("world_players")
      .select("*")
      .eq("league_id", leagueId)
      .order("goals", { ascending: false, nullsFirst: false })
      .order("rating", { ascending: false, nullsFirst: false })
      .limit(20);
    if (error || !data || data.length < 5) return null;
    return {
      players: data.map(rowToWorldPlayer),
      paging: { current: 1, total: 1 },
      source: "database",
    };
  } catch {
    return null;
  }
}
