/**
 * Shared server-only fetcher for API-Football.
 *
 * Centralizes the base URL, error handling, season fallback logic and quota
 * tracking so every proxy module (live feed, match details, player search,
 * world-player sync) counts its upstream calls the same way.
 */

import { trackApiUsage } from "@/lib/api-usage.server";

const API_BASE = "https://v3.football.api-sports.io";

export function apiFootballKey(): string | undefined {
  return process.env["API_FOOTBALL_KEY"];
}

/** Fetch a single API-Football endpoint; returns null on any upstream error. */
export async function apiFootball<T>(path: string, apiKey: string): Promise<T | null> {
  void trackApiUsage(path.split("?")[0]?.replace(/^\//, "") ?? "unknown");
  try {
    const res = await fetch(`${API_BASE}${path}`, { headers: { "x-apisports-key": apiKey } });
    if (!res.ok) {
      console.error(`[api-football] ${path} -> ${res.status}`);
      return null;
    }
    return (await res.json()) as T;
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
