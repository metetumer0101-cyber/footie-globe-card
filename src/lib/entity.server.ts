/**
 * Server-only helpers for team pages (SportMonks).
 * Imported exclusively by src/lib/entity.functions.ts (the thin wrapper).
 */

import { sportMonks, type SportMonksEnvelope, type SportMonksList } from "@/lib/api-sportmonks.server";
import { mapSmTeamHit, mapSmTeamPage, type SMTeam } from "@/lib/sportmonks.mappers";

type SMVenue = { name?: string; city?: string; capacity?: number };
type SMTeamWithVenue = SMTeam & { founded?: number; venue?: SMVenue | null };

export type SquadPlayer = {
  id: number;
  name: string;
  age?: number | undefined;
  number?: number | undefined;
  position?: string | undefined;
  photo: string;
};

export type TeamPageData = {
  id: number;
  name: string;
  logo?: string | undefined;
  country?: string | undefined;
  founded?: number | undefined;
  venueName?: string | undefined;
  venueCity?: string | undefined;
  venueCapacity?: number | undefined;
  squad: SquadPlayer[];
};

export type TeamSearchHit = {
  id: number;
  name: string;
  logo?: string | undefined;
  country?: string | undefined;
};

export async function fetchTeamById(teamId: number): Promise<TeamPageData | null> {
  // `/teams/{id}?include=venue`. The `squad`/`player` includes 404 on the
  // current plan, so the squad list is empty (honest) until a higher plan is
  // granted; team identity + venue still render from the base payload.
  const json = await sportMonks<SportMonksEnvelope<SMTeamWithVenue>>({ path: `/teams/${teamId}`, include: ["venue"] });
  const t = json?.data;
  if (!t?.id) return null;
  return mapSmTeamPage(t, [], {
    country: t.country_id != null ? String(t.country_id) : undefined,
    founded: t.founded,
    venue_name: t.venue?.name,
    venue_city: t.venue?.city,
    venue_capacity: t.venue?.capacity,
  });
}

export async function searchTeamsByName(query: string): Promise<TeamSearchHit[]> {
  const json = await sportMonks<SportMonksList<SMTeam>>({ path: `/teams/search/${encodeURIComponent(query)}` });
  return (json?.data ?? []).filter((tm) => tm.id).slice(0, 12).map(mapSmTeamHit);
}

/** Resolve a display name (e.g. a local catalogue team) to a live team page. */
export async function fetchTeamByName(name: string): Promise<TeamPageData | null> {
  const hits = await searchTeamsByName(name);
  const hit = hits.find((h) => h.name.toLowerCase() === name.toLowerCase()) ?? hits[0];
  if (!hit) return null;
  return fetchTeamById(hit.id);
}
