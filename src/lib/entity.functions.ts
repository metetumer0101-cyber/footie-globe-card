import { createServerFn } from "@tanstack/react-start";
import { cached, cachedMeta, type CachedResult } from "@/lib/api-cache.server";
import { TTL } from "@/lib/freshness-config";
import {
  fetchTeamById,
  fetchTeamByName,
  searchTeamsByName,
  type TeamPageData,
  type TeamSearchHit,
} from "@/lib/entity.server";

/** Full team page payload (info + venue + squad) by SportMonks team id. */
export const getTeamPage = createServerFn({ method: "GET" })
  .inputValidator((input: { teamId: number }) => input)
  .handler(async ({ data }): Promise<CachedResult<TeamPageData | null>> => {
    if (!Number.isFinite(data.teamId)) return { data: null, fetchedAt: null };
    return cachedMeta(`team:${data.teamId}`, TTL.SQUAD, () => fetchTeamById(data.teamId), null);
  });

/** Resolve a catalogue team by display name, then load its live page data. */
export const getTeamPageByName = createServerFn({ method: "GET" })
  .inputValidator((input: { name: string }) => input)
  .handler(async ({ data }): Promise<CachedResult<TeamPageData | null>> => {
    const name = data.name.trim();
    if (!name) return { data: null, fetchedAt: null };
    return cachedMeta(
      `team-name:${name.toLowerCase()}`,
      TTL.SQUAD,
      () => fetchTeamByName(name),
      null,
    );
  });

/** Worldwide team search (min 3 characters). */
export const searchWorldTeams = createServerFn({ method: "GET" })
  .inputValidator((input: { query: string }) => input)
  .handler(async ({ data }): Promise<TeamSearchHit[]> => {
    const query = data.query.trim();
    if (query.length < 3) return [];
    return cached(
      `team-search:${query.toLowerCase()}`,
      TTL.SEARCH,
      () => searchTeamsByName(query),
      [],
    );
  });
