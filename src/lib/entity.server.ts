/**
 * Server-only helpers for team pages (SportMonks).
 * Imported exclusively by src/lib/entity.functions.ts (the thin wrapper).
 */

import { sportMonks, type SportMonksEnvelope, type SportMonksList } from "@/lib/api-sportmonks.server";
import { mapSmTeamHit, mapSmTeamPage, smPositionName, type SMTeam } from "@/lib/sportmonks.mappers";

type SMVenue = { name?: string; city?: string; capacity?: number };

/** A squad membership row embedded by `?include=players.player`. */
type SMSquadMembership = {
  id?: number;
  player_id?: number;
  position_id?: number;
  jersey_number?: number;
  player?: {
    id?: number;
    name?: string;
    display_name?: string;
    image_path?: string;
    date_of_birth?: string;
    position_id?: number;
  } | null;
};

type SMTeamWithVenue = SMTeam & {
  founded?: number;
  venue?: SMVenue | null;
  country?: { id?: number; name?: string; image_path?: string } | null;
  players?: SMSquadMembership[];
};

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
  // `/teams/{id}?include=venue;country;players.player`. The `players` relation
  // returns squad membership rows (jersey number, position) with the player
  // resource nested under `players.player`; `country` resolves the team's
  // country name (the base payload only carries `country_id`).
  const json = await sportMonks<SportMonksEnvelope<SMTeamWithVenue>>({
    path: `/teams/${teamId}`,
    include: ["venue", "country", "players.player"],
  });
  const t = json?.data;
  if (!t?.id) return null;
  const squad: SquadPlayer[] = (t.players ?? []).map((m) => {
    const p = m.player;
    const birth = p?.date_of_birth ? new Date(p.date_of_birth) : null;
    return {
      id: p?.id ?? m.player_id ?? 0,
      name: p?.name ?? p?.display_name ?? "—",
      age:
        birth && !Number.isNaN(birth.getTime())
          ? Math.max(0, Math.floor((Date.now() - birth.getTime()) / (365.25 * 86400_000)))
          : undefined,
      number: m.jersey_number,
      position: smPositionName({ position_id: m.position_id ?? p?.position_id }),
      photo: p?.image_path ?? "",
    };
  });
  return mapSmTeamPage(t, squad, {
    country: t.country?.name,
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
