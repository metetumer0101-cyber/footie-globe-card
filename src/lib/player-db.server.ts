/**
 * Server-only world-player database layer.
 *
 * API-Football has no "list every player" endpoint, so FootCard keeps its own
 * copy in the `world_players` table, refreshed league-by-league (nightly via
 * the cron route, or on demand from the admin panel). Search and browse then
 * read from the local table — instant and quota-free — with the live API as
 * fallback for anything not synced yet.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { apiFootball, seasonCandidates } from "@/lib/api-football.server";
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

/** ~35 pages x 20 rows covers even the largest squads; caps runaway paging. */
const MAX_PAGES_PER_LEAGUE = 35;
const PAGE_DELAY_MS = 110;
export const SEARCH_PAGE_SIZE = 20;

type ApiPlayersResponse = {
  paging?: { current?: number; total?: number };
  response?: {
    player?: {
      id?: number;
      name?: string;
      firstname?: string;
      lastname?: string;
      age?: number;
      nationality?: string;
      height?: string;
      weight?: string;
      photo?: string;
      injured?: boolean;
    };
    statistics?: {
      team?: { id?: number; name?: string };
      league?: { id?: number; name?: string };
      games?: { position?: string; appearences?: number; rating?: string; minutes?: number };
      goals?: { total?: number; assists?: number };
    }[];
  }[];
};

function num(raw?: string | number | null): number | undefined {
  if (raw == null) return undefined;
  const parsed = parseInt(String(raw), 10);
  return Number.isFinite(parsed) ? parsed : undefined;
}

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

type WorldPlayerInsert = Database["public"]["Tables"]["world_players"]["Insert"];

async function upsertPage(
  db: SupabaseClient<Database>,
  rows: NonNullable<ApiPlayersResponse["response"]>,
  leagueId: number,
  leagueName: string,
  season: number,
): Promise<number> {
  const payload: WorldPlayerInsert[] = rows
    .filter((r) => r.player?.id)
    .map((r) => {
      const p = r.player!;
      const s = r.statistics?.[0];
      const rating = parseFloat(s?.games?.rating ?? "");
      return {
        api_id: p.id as number,
        name: p.name ?? `${p.firstname ?? ""} ${p.lastname ?? ""}`.trim() || "—",
        firstname: p.firstname ?? null,
        lastname: p.lastname ?? null,
        age: p.age ?? null,
        nationality: p.nationality ?? null,
        position: s?.games?.position ?? null,
        photo: p.photo ?? null,
        club: s?.team?.name ?? null,
        club_id: s?.team?.id ?? null,
        league: s?.league?.name ?? leagueName,
        league_id: s?.league?.id ?? leagueId,
        season,
        rating: Number.isFinite(rating) ? rating : null,
        appearances: s?.games?.appearences ?? null,
        minutes: s?.games?.minutes ?? null,
        goals: s?.goals?.total ?? null,
        assists: s?.goals?.assists ?? null,
        height_cm: num(p.height?.replace(/\D/g, "")) ?? null,
        weight_kg: num(p.weight?.replace(/\D/g, "")) ?? null,
        injured: Boolean(p.injured),
        updated_at: new Date().toISOString(),
      } satisfies WorldPlayerInsert;
    });
  if (!payload.length) return 0;
  const { error } = await db.from("world_players").upsert(payload, { onConflict: "api_id" });
  if (error) {
    console.error(`[player-db] upsert failed for league ${leagueId}`, error.message);
    return 0;
  }
  return payload.length;
}

export type LeagueSyncResult = {
  leagueId: number;
  season: number;
  pages: number;
  upserted: number;
};

/**
 * Mirror every player of one league into `world_players`. Walks season
 * candidates so free-tier keys (capped at older seasons) still populate the
 * table. Returns null when the league has no data in any reachable season.
 */
export async function syncLeaguePlayers(
  leagueId: number,
  apiKey: string,
): Promise<LeagueSyncResult | null> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const leagueName = SYNC_LEAGUES.find((l) => l.id === leagueId)?.name ?? `League ${leagueId}`;

  for (const season of seasonCandidates()) {
    const first = await apiFootball<ApiPlayersResponse>(
      `/players?league=${leagueId}&season=${season}&page=1`,
      apiKey,
    );
    if (!first?.response?.length) continue;

    const totalPages = Math.min(first.paging?.total ?? 1, MAX_PAGES_PER_LEAGUE);
    let upserted = await upsertPage(supabaseAdmin, first.response, leagueId, leagueName, season);

    for (let page = 2; page <= totalPages; page++) {
      await delay(PAGE_DELAY_MS);
      const json = await apiFootball<ApiPlayersResponse>(
        `/players?league=${leagueId}&season=${season}&page=${page}`,
        apiKey,
      );
      if (!json?.response?.length) break;
      upserted += await upsertPage(supabaseAdmin, json.response, leagueId, leagueName, season);
    }
    return { leagueId, season, pages: totalPages, upserted };
  }
  return null;
}

/** Publishable-key client for public reads of the world_players table. */
function publicDb(): SupabaseClient<Database> {
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  return createClient<Database>(process.env["SUPABASE_URL"]!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) {
          h.delete("Authorization");
        }
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

type WorldPlayerRow = Database["public"]["Tables"]["world_players"]["Row"];

function rowToWorldPlayer(row: WorldPlayerRow): WorldPlayer {
  return {
    id: row.api_id,
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
