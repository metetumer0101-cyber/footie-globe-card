import { createFileRoute } from "@tanstack/react-router";

/**
 * Nightly world-player sync, called once per league by pg_cron.
 *
 * Callers authenticate with `Authorization: Bearer <token>` where the token is
 * either the CRON_SECRET env var or the `sync_token` stored in the service-role
 * only `cron_config` table (what pg_cron uses). One league per invocation
 * keeps each request comfortably inside serverless time limits; the scheduler
 * fires one request per league.
 */
export const Route = createFileRoute("/api/public/cron/sync-players")({
  server: {
    handlers: {
      GET: async ({ request }) => handle(request),
      POST: async ({ request }) => handle(request),
    },
  },
});

async function handle(request: Request): Promise<Response> {
  const provided = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!provided) return new Response("Unauthorized", { status: 401 });

  let authorized = Boolean(process.env["CRON_SECRET"]) && provided === process.env["CRON_SECRET"];
  if (!authorized) {
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data } = await supabaseAdmin
        .from("cron_config")
        .select("value")
        .eq("key", "sync_token")
        .maybeSingle();
      authorized = Boolean(data?.value) && provided === data.value;
    } catch {
      authorized = false;
    }
  }
  if (!authorized) return new Response("Unauthorized", { status: 401 });

  const apiKey = process.env["API_FOOTBALL_KEY"];
  if (!apiKey) {
    return Response.json({ error: "API_FOOTBALL_KEY is not configured" }, { status: 500 });
  }

  const leagueParam = new URL(request.url).searchParams.get("league");
  const leagueId = leagueParam ? parseInt(leagueParam, 10) : NaN;
  if (!Number.isFinite(leagueId) || leagueId <= 0) {
    return Response.json(
      { error: "Query param ?league=<id> is required (one league per call)" },
      { status: 400 },
    );
  }

  const { syncLeaguePlayers } = await import("@/lib/player-db.server");
  const result = await syncLeaguePlayers(leagueId, apiKey);
  return Response.json(
    result ?? { leagueId, season: 0, pages: 0, upserted: 0, note: "no data in any reachable season" },
  );
}
