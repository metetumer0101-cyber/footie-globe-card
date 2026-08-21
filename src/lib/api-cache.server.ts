/**
 * Server-only cache for external football API responses.
 *
 * Responses are persisted in the `api_cache` table (service-role only) so that
 * repeated requests within the TTL window never hit the upstream provider.
 * All failures are swallowed: caching must never break a request.
 */

export async function readCache<T>(key: string): Promise<T | null> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("api_cache")
      .select("payload, expires_at")
      .eq("cache_key", key)
      .maybeSingle();
    if (error || !data) return null;
    if (new Date(data.expires_at).getTime() < Date.now()) return null;
    return data.payload as T;
  } catch {
    return null;
  }
}

export async function writeCache(key: string, payload: unknown, ttlSeconds: number): Promise<void> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("api_cache").upsert(
      {
        cache_key: key,
        payload: payload as never,
        expires_at: new Date(Date.now() + ttlSeconds * 1000).toISOString(),
      },
      { onConflict: "cache_key" },
    );
  } catch {
    /* cache writes are best-effort */
  }
}

/** Read-through cache helper with graceful degradation to `fallback`. */
export async function cached<T>(
  key: string,
  ttlSeconds: number,
  loader: () => Promise<T | null>,
  fallback: T,
): Promise<T> {
  const hit = await readCache<T>(key);
  if (hit) return hit;
  try {
    const fresh = await loader();
    if (fresh) {
      await writeCache(key, fresh, ttlSeconds);
      return fresh;
    }
  } catch (error) {
    console.error(`[api-cache] loader failed for ${key}`, error);
  }
  return fallback;
}
