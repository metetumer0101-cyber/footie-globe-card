/**
 * Shared server-only fetcher for SportMonks Soccer API (v3).
 *
 * This is the single source of truth (SSOT) for every SportMonks call, mirroring
 * every SportMonks call. It centralises the base URL, authentication, HTTP
 * error classification, quota detection, usage tracking and the `sm:` cache-key
 * prefix so all reads route through one consistent client.
 *
 * This is the sole data provider now — the API-Football client was fully removed
 * in Step 4 (cleanup), so there is no longer a `USE_SPORTMONKS` feature flag to
 * toggle between providers. SportMonks is the only provider.
 *
 * NOTE ON THE SportMonks v3 data model (confirmed during research):
 *  - Base `https://api.sportmonks.com/v3/football`, auth via `?api_token=` query
 *    or `Authorization: Bearer`.
 *  - Listing payloads are `{ "data": [...] , "meta": {...} }` (unlike API-Football's
 *    `{ "response": [...] }`).
 *  - There are NO path-based sub-resources (`/squads/*`, `/top-scorers/*`,
 *    `/injuries/*`, `/standings/season/*`, `/fixtures/{id}/events|statistics|lineup`
 *    all 404). That relational data is embedded on the primary resource via
 *    `?include=events;statistics;lineups;localTeam;visitorTeam;league`.
 */

import { trackApiUsage } from "@/lib/api-usage.server";
import { reportQuotaExhausted, reportUpstreamOk } from "@/lib/system-status.server";
import { cached, cachedMeta, type CachedResult } from "@/lib/api-cache.server";

const SM_BASE = "https://api.sportmonks.com/v3/football";

/** The SportMonks access token (server env only). Undefined when not configured. */
export function sportMonksToken(): string | undefined {
  return process.env["SPORTMONKS_API_TOKEN"];
}

/** Calendar start-year of the current season (UTC: Jun+ means the new year). */
export function currentSeason(): number {
  const now = new Date();
  return now.getUTCMonth() >= 6 ? now.getUTCFullYear() : now.getUTCFullYear() - 1;
}

/** Classify a SportMonks error response status for callers. */
export type SportMonksErrorKind = "ok" | "invalid_token" | "missing" | "invalid_params" | "quota" | "server" | "network";

/** SportMonks error body shape (all errors return `{ message, errors? }`). */
export type SportMonksError = { message?: string; errors?: Record<string, unknown> };

export type SportMonksQuery = {
  /** Path after the base, e.g. `/fixtures/date/2024-08-10`. */
  path: string;
  /** Comma/semicolon-list or array of relation names to embed (`?include=...`). */
  include?: string | readonly string[];
  /** `filter[...]` params, e.g. `{ league_id: 8, season_id: 21646 }`. */
  filters?: Record<string, string | number>;
  /** Pagination page for `/players` etc. */
  page?: number;
  /** Pagination `per_page`. */
  perPage?: number;
};

function classifyStatus(status: number, message: string | undefined): SportMonksErrorKind {
  if (status === 429) return "quota";
  if (status === 401) return "invalid_token";
  if (status === 404) return "missing";
  if (status === 422) return "invalid_params";
  if (status >= 500) return "server";
  if (status === 400) return "invalid_params";
  return "ok";
}

/**
 * Report quota state to the system-status tracker. SportMonks signals quota in
 * a few ways: an HTTP 429, a `x-ratelimit-remaining: 0` header, or an error body
 * whose message mentions quota / rate limit. Everything else counts as "upstream
 * ok" so the UI's honest empty states stay driven by real facts.
 */
function detectQuota(status: number, message: string | undefined): void {
  if (status === 429) {
    reportQuotaExhausted();
    return;
  }
  const msg = (message ?? "").toLowerCase();
  if (/quota|rate limit|limit exceeded|too many requests/i.test(msg)) {
    reportQuotaExhausted();
    return;
  }
  reportUpstreamOk();
}

function endpointForUsage(path: string): string {
  return `sm:${path.split("?")[0]?.replace(/^\//, "") ?? "unknown"}`;
}

function buildUrl(query: SportMonksQuery, token: string): string {
  const params = new URLSearchParams();
  params.set("api_token", token);
  if (query.include) {
    const inc = Array.isArray(query.include) ? query.include.join(";") : (query.include as string);
    params.set("include", inc);
  }
  if (query.filters) {
    for (const [k, v] of Object.entries(query.filters)) params.set(`filter[${k}]`, String(v));
  }
  if (query.page != null) params.set("page", String(query.page));
  if (query.perPage != null) params.set("per_page", String(query.perPage));
  const qs = params.toString();
  // `path` may already carry a query string; append ours after it.
  const [base, existing] = query.path.split("?");
  return `${SM_BASE}${base}${existing ? `?${existing}&${qs}` : `?${qs}`}`;
}

/**
 * Fetch a single SportMonks endpoint and return the decoded body, or null on any
 * error. Every call is counted via `trackApiUsage` and its quota state reported
 * through the shared system-status tracker.
 */
export async function sportMonks<T>(query: SportMonksQuery): Promise<T | null> {
  const path = query.path;
  void trackApiUsage(endpointForUsage(path));
  const token = sportMonksToken();
  if (!token) return null;
  try {
    const url = buildUrl(query, token);
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    let body: T | null = null;
    let errMsg: string | undefined;

    if (res.ok) {
      body = (await res.json()) as T;
      detectQuota(res.status, undefined);
    } else {
      try {
        const e = (await res.json()) as SportMonksError;
        errMsg = e?.message;
      } catch {
        /* non-JSON error body */
      }
      void errMsg;
      console.error(`[api-sportmonks] ${path} -> ${res.status} (${errMsg ?? "no body"})`);
      detectQuota(res.status, errMsg);
      return null;
    }

    // Header-based quota signal (some plans expose rate-limit headers).
    const remaining = res.headers.get("x-ratelimit-remaining");
    if (remaining !== null && Number(remaining) === 0) reportQuotaExhausted();

    return body;
  } catch (error) {
    console.error(`[api-sportmonks] ${path} failed`, error);
    reportQuotaExhausted();
    return null;
  }
}

/** Raw SportMonks list envelope: `{ data: [...] , meta }`. */
export type SportMonksList<T> = {
  data: T[];
  meta?: {
    pagination?: { current_page?: number; last_page?: number; per_page?: number; total?: number };
  };
};

/** Raw SportMonks single/envelope for topped resources. */
export type SportMonksEnvelope<T> = { data: T };

/**
 * Cache-key namespace for SportMonks-backed entries. Entries are written with an
 * `sm:` prefix so they never collide with the legacy `af:`/unprefixed rows that
 * the API-Football client wrote into `api_cache`.
 */
export function smCacheKey(key: string): string {
  return `sm:${key}`;
}

/** Read-through cache wrapper that namespaces keys under `sm:`. */
export async function sportMonksCached<T>(
  cacheKey: string,
  ttlSeconds: number,
  loader: () => Promise<T | null>,
  fallback: T,
): Promise<T> {
  return cached<T>(smCacheKey(cacheKey), ttlSeconds, loader, fallback);
}

/** Like {@link sportMonksCached} but reports when the served data was fetched. */
export async function sportMonksCachedMeta<T>(
  cacheKey: string,
  ttlSeconds: number,
  loader: () => Promise<T | null>,
  fallback: T,
): Promise<CachedResult<T>> {
  return cachedMeta<T>(smCacheKey(cacheKey), ttlSeconds, loader, fallback);
}

/**
 * Resolve the current `season_id` for a league. SportMonks identifies seasons by
 * opaque numeric ids (not the calendar year API-Football used). This uses the
 * documented `/leagues/{id}?include=season` (or `/seasons` filter) pattern; the
 * exact include name is finalised against the real token during Step 2, and this
 * helper stays deliberately tolerant to that.
 */
export async function resolveSeasonId(leagueId: number): Promise<number | null> {
  const json = await sportMonks<{
    data?: {
      current_season_id?: number;
      seasons?: { data?: { id?: number }[] };
    } | null;
  }>({ path: `/leagues/${leagueId}?include=season` });
  const current = json?.data?.current_season_id;
  if (current) return current;
  const firstSeason = json?.data?.seasons?.data?.[0]?.id;
  return firstSeason ?? null;
}
