import { bustCache } from "./api-cache.server";

/**
 * Cache prefixes that hold live/cached upstream data and therefore must be
 * invalidated when the daily quota resets, so the next read re-fetches from
 * the provider and writes fresh rows to Supabase (`api_cache`).
 */
export const LIVE_CACHE_PREFIXES = [
  "fixtures-day:",
  "live-all",
  "live:",
  "league-top:",
  "player-search:",
  "player-card:",
  "team-fixtures:",
  "standings:",
  "match-detail:",
  "transfers:",
  "injuries:",
  "current-club:",
  "team-search:",
  "team-name:",
  "team:",
];

/** Milliseconds between two UTC midnights (the API-Football quota window). */
const MS_PER_DAY = 86_400_000;

let armed = false;
let timer: ReturnType<typeof setTimeout> | null = null;

/** Milliseconds until the next UTC 00:00 (when the daily quota resets). */
export function msUntilNextUtcMidnight(now = new Date()): number {
  const nextMidnight = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0, 0);
  return Math.max(0, nextMidnight - now.getTime());
}

/**
 * Arm the UTC-midnight cache invalidation + warm refresh.
 *
 * This is an in-process timer, not a platform CRON: this Nitro-under-Bun
 * environment offers no guaranteed long-lived scheduled job, so the portable,
 * actually-works mechanism is a self-rescheduling `setTimeout` aligned to the
 * next UTC midnight. It is armed lazily from the server-side status / live-feed
 * handlers on the first request a worker handles, and re-arms itself for the
 * following midnight after firing — so it keeps running for as long as the
 * process is alive (which, on a long-running server, is effectively permanent).
 *
 * At UTC 00:00 — when the API-Football daily quota resets — it:
 *   1. busts the relevant cache prefixes so the next read re-fetches fresh
 *      upstream data (and rewrites it to Supabase via the existing api_cache
 *      writer), and
 *   2. warms the live feed + home weekly-best so cache/Supabase stay populated
 *      even without waiting for a user request.
 *
 * Honest limits: if the process is restarted and receives no traffic, no
 * request re-arms it. Because every Home/Live request re-arms the timer (via
 * `getSystemStatus` and `getLiveFeed`), it is effectively always live under
 * real usage.
 */
export function ensureMidnightRefresh(): void {
  if (armed) return;
  armed = true;
  schedule();
}

function schedule(): void {
  // A small 2s cushion past midnight so the provider has rolled its window.
  const delay = Math.min(msUntilNextUtcMidnight() + 2_000, MS_PER_DAY);
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    void runRefresh().finally(schedule);
  }, delay);
}

async function runRefresh(): Promise<void> {
  try {
    await bustCache([], LIVE_CACHE_PREFIXES);
    console.info("[midnight-refresh] live cache invalidated at UTC midnight");
  } catch (error) {
    console.error("[midnight-refresh] cache bust failed", error);
  }
  // Warm the primary consumers so fresh data is fetched and written to
  // Supabase now, not on the next user visit. Dynamic imports keep this
  // module free of static circular dependencies.
  try {
    const { getLiveFeed, getHomeWeeklyBest } = await import("./live.functions");
    await Promise.allSettled([getLiveFeed(), getHomeWeeklyBest()]);
  } catch (error) {
    console.error("[midnight-refresh] warm refresh failed", error);
  }
}
