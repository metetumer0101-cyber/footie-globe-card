/**
 * Server-only cache for external football API responses.
 *
 * Responses are persisted in the `api_cache` table (service-role only) so that
 * repeated requests within the TTL window never hit the upstream provider.
 * Expired entries are served immediately (stale-while-revalidate) while a
 * background refresh repopulates the cache, so users never wait on the
 * upstream API. All failures are swallowed: caching must never break a request.
 */

export type CacheEntry<T> = { payload: T; fetchedAt: number; fresh: boolean };

export type CachedResult<T> = { data: T; fetchedAt: number | null };

/** How long an expired entry may still be served: 10x TTL, bounded to [5 min, 7 days]. */
function maxStaleMs(ttlSeconds: number): number {
  return Math.min(Math.max(ttlSeconds * 1000 * 10, 5 * 60_000), 7 * 86_400_000);
}

/** Read a cache row together with its freshness metadata. */
export async function readCacheEntry<T>(
  key: string,
  ttlSeconds: number,
): Promise<CacheEntry<T> | null> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("api_cache")
      .select("payload, expires_at")
      .eq("cache_key", key)
      .maybeSingle();
    if (error || !data) return null;
    const expiresAt = new Date(data.expires_at).getTime();
    return {
      payload: data.payload as T,
      fetchedAt: expiresAt - ttlSeconds * 1000,
      fresh: expiresAt > Date.now(),
    };
  } catch {
    return null;
  }
}

/** Fresh-only read (used for short-lived coordination tickets). */
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

export async function writeCache(
  key: string,
  payload: unknown,
  ttlSeconds: number,
): Promise<void> {
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

/** Delete exact keys and prefix matches (manual refresh / cache busting). */
export async function bustCache(keys: string[] = [], prefixes: string[] = []): Promise<void> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (keys.length) {
      await supabaseAdmin.from("api_cache").delete().in("cache_key", keys);
    }
    for (const prefix of prefixes) {
      await supabaseAdmin.from("api_cache").delete().like("cache_key", `${prefix}%`);
    }
  } catch {
    /* busting is best-effort */
  }
}

/** In-flight dedupe so a burst of requests triggers at most one background refresh. */
const inflight = new Set<string>();

function backgroundRefresh<T>(key: string, ttlSeconds: number, loader: () => Promise<T | null>) {
  if (inflight.has(key)) return;
  inflight.add(key);
  void (async () => {
    try {
      const fresh = await loader();
      if (fresh) await writeCache(key, fresh, ttlSeconds);
    } catch (error) {
      console.error(`[api-cache] background refresh failed for ${key}`, error);
    } finally {
      inflight.delete(key);
    }
  })();
}

/** Read-through cache with stale-while-revalidate and graceful degradation to `fallback`. */
export async function cached<T>(
  key: string,
  ttlSeconds: number,
  loader: () => Promise<T | null>,
  fallback: T,
): Promise<T> {
  const entry = await readCacheEntry<T>(key, ttlSeconds);
  if (entry?.fresh) return entry.payload;
  if (entry) {
    const expiredFor = Date.now() - (entry.fetchedAt + ttlSeconds * 1000);
    if (expiredFor < maxStaleMs(ttlSeconds)) {
      backgroundRefresh(key, ttlSeconds, loader);
      return entry.payload;
    }
  }
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

/** Same as {@link cached} but also reports when the served data was fetched. */
export async function cachedMeta<T>(
  key: string,
  ttlSeconds: number,
  loader: () => Promise<T | null>,
  fallback: T,
): Promise<CachedResult<T>> {
  const entry = await readCacheEntry<T>(key, ttlSeconds);
  if (entry?.fresh) return { data: entry.payload, fetchedAt: entry.fetchedAt };
  if (entry) {
    const expiredFor = Date.now() - (entry.fetchedAt + ttlSeconds * 1000);
    if (expiredFor < maxStaleMs(ttlSeconds)) {
      backgroundRefresh(key, ttlSeconds, loader);
      return { data: entry.payload, fetchedAt: entry.fetchedAt };
    }
  }
  try {
    const fresh = await loader();
    if (fresh) {
      await writeCache(key, fresh, ttlSeconds);
      return { data: fresh, fetchedAt: Date.now() };
    }
  } catch (error) {
    console.error(`[api-cache] loader failed for ${key}`, error);
  }
  return { data: fallback, fetchedAt: entry?.fetchedAt ?? null };
}
