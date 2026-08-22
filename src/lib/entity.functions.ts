import { createServerFn } from "@tanstack/react-start";
import { cached } from "@/lib/api-cache.server";
import {
  fetchTeamById,
  fetchTeamByName,
  searchTeamsByName,
  type TeamPageData,
  type TeamSearchHit,
} from "@/lib/entity.server";

/** Full team page payload (info + venue + squad) by API-Football team id. */
export const getTeamPage = createServerFn({ method: "GET" })
  .inputValidator((input: { teamId: number }) => input)
  .handler(async ({ data }): Promise<TeamPageData | null> => {
    const apiKey = process.env["API_FOOTBALL_KEY"];
    if (!apiKey || !Number.isFinite(data.teamId)) return null;
    return cached(`team:${data.teamId}`, 86_400, () => fetchTeamById(data.teamId, apiKey), null);
  });

/** Resolve a catalogue team by display name, then load its live page data. */
export const getTeamPageByName = createServerFn({ method: "GET" })
  .inputValidator((input: { name: string }) => input)
  .handler(async ({ data }): Promise<TeamPageData | null> => {
    const apiKey = process.env["API_FOOTBALL_KEY"];
    const name = data.name.trim();
    if (!apiKey || !name) return null;
    return cached(
      `team-name:${name.toLowerCase()}`,
      86_400,
      () => fetchTeamByName(name, apiKey),
      null,
    );
  });

/** Worldwide team search (min 3 characters). */
export const searchWorldTeams = createServerFn({ method: "GET" })
  .inputValidator((input: { query: string }) => input)
  .handler(async ({ data }): Promise<TeamSearchHit[]> => {
    const apiKey = process.env["API_FOOTBALL_KEY"];
    const query = data.query.trim();
    if (!apiKey || query.length < 3) return [];
    return cached(
      `team-search:${query.toLowerCase()}`,
      86_400,
      () => searchTeamsByName(query, apiKey),
      [],
    );
  });
