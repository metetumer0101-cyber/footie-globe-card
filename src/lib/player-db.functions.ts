import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireAdmin, requireAdminOrModerator } from "@/lib/admin.server";
import { syncLeaguePlayers, SYNC_LEAGUES } from "@/lib/player-db.server";

/** Admin-triggered mirror of one league into world_players. */
export const syncLeagueNow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { leagueId: number }) => input)
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const apiKey = process.env["API_FOOTBALL_KEY"];
    if (!apiKey) throw new Error("API_FOOTBALL_KEY is not configured");
    const result = await syncLeaguePlayers(data.leagueId, apiKey);
    return (
      result ?? {
        leagueId: data.leagueId,
        season: 0,
        pages: 0,
        upserted: 0,
      }
    );
  });

/** Leagues available for mirroring (drives the admin sync UI). */
export const listSyncLeagues = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdminOrModerator(context);
    return SYNC_LEAGUES;
  });

/** Quota + mirror overview for the admin data dashboard. */
export const getDataOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdminOrModerator(context);

    const sevenDaysAgo = new Date(Date.now() - 7 * 86_400_000).toISOString().slice(0, 10);
    const [playersCount, latest, usage] = await Promise.all([
      context.supabase
        .from("world_players")
        .select("api_id", { count: "exact", head: true }),
      context.supabase
        .from("world_players")
        .select("updated_at")
        .order("updated_at", { ascending: false })
        .limit(1),
      context.supabase
        .from("api_usage")
        .select("day, endpoint, requests")
        .gte("day", sevenDaysAgo)
        .order("day", { ascending: false })
        .order("requests", { ascending: false }),
    ]);

    let cacheEntries: number | null = null;
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { count } = await supabaseAdmin
        .from("api_cache")
        .select("cache_key", { count: "exact", head: true });
      cacheEntries = count ?? null;
    } catch {
      /* cache stats are best-effort */
    }

    return {
      playersCount: playersCount.count ?? 0,
      lastSyncAt: latest.data?.[0]?.updated_at ?? null,
      cacheEntries,
      usage: (usage.data ?? []).map((u) => ({
        day: u.day,
        endpoint: u.endpoint,
        requests: u.requests,
      })),
    };
  });
