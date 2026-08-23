/**
 * Shared server-only fetcher for API-Football.
 *
 * Centralizes the base URL, error handling, season fallback logic and quota
 * tracking so every proxy module (live feed, match details, player search,
 * world-player sync) counts its upstream calls the same way.
 */

import { trackApiUsage } from "@/lib/api-usage.server";
import { reportQuotaExhausted, reportUpstreamOk } from "@/lib/system-status.server";

const API_BASE = "https://v3.football.api-sports.io";

export function apiFootballKey(): string | undefined {
  return process.env["API_FOOTBALL_KEY"];
}

/**
 * Detect whether an API-Football response means the daily request quota is
 * exhausted. The provider signals it two ways: the `X-RateLimit-Remaining`
 * response header dropping to `0`, and/or an `errors.requests` /
 * `errors.rateLimit` entry in the JSON body. We report either to the
 * system-status tracker so the UI can show an honest empty state.
 */
function detectQuota(res: Response, body: { errors?: { requests?: unknown; rateLimit?: unknown } } | null): void {
  const remaining = res.headers.get("x-ratelimit-remaining");
  if (remaining !== null && Number(remaining) === 0) {
    reportQuotaExhausted();
    return;
  }
  const errs = body?.errors;
  if (errs && (errs.requests || errs.rateLimit)) {
    reportQuotaExhausted();
    return;
  }
  reportUpstreamOk();
}

/** Fetch a single API-Football endpoint; returns null on any upstream error. */
export async function apiFootball<T>(path: string, apiKey: string): Promise<T | null> {
  void trackApiUsage(path.split("?")[0]?.replace(/^\//, "") ?? "unknown");
  try {
    const res = await fetch(`${API_BASE}${path}`, { headers: { "x-apisports-key": apiKey } });
    let body: T | null = null;
    if (res.ok) {
      body = (await res.json()) as T;
    } else {
      console.error(`[api-football] ${path} -> ${res.status}`);
    }
    // Classify quota (only fire the JSON parse once; the body type above is
    // the parsed payload, which is what we inspect for error markers).
    const raw = body as unknown as { errors?: { requests?: unknown; rateLimit?: unknown } } | null;
    if (res.ok) detectQuota(res, raw);
    return body;
  } catch (error) {
    console.error(`[api-football] ${path} failed`, error);
    return null;
  }
}

export function currentSeason(): number {
  const now = new Date();
  return now.getUTCMonth() >= 6 ? now.getUTCFullYear() : now.getUTCFullYear() - 1;
}

/** Seasons to try, newest first (free API tiers cap at older seasons). */
export function seasonCandidates(preferred?: number): number[] {
  const base = preferred ?? currentSeason();
  return [...new Set([base, base - 1, 2024, 2023])];
}
