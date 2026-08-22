/**
 * Server-only quota accounting for the external football API.
 *
 * Every upstream request increments a per-day, per-endpoint counter in the
 * `api_usage` table (service-role only). The admin dashboard reads these
 * counters to show how much of the daily quota has been consumed. Tracking
 * is best-effort and must never break the request it accompanies.
 */

export async function trackApiUsage(endpoint: string, count = 1): Promise<void> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.rpc("increment_api_usage", { _endpoint: endpoint, _count: count });
  } catch {
    /* usage tracking is best-effort */
  }
}
