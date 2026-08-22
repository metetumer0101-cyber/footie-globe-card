/**
 * Server-only helpers for team pages (API-Football).
 * Imported exclusively by src/lib/entity.functions.ts (the thin wrapper).
 */

const API_BASE = "https://v3.football.api-sports.io";

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

type TeamsResponse = {
  response?: {
    team?: {
      id?: number;
      name?: string;
      country?: string;
      founded?: number;
      logo?: string;
    };
    venue?: { name?: string; city?: string; capacity?: number };
  }[];
};

async function apiFootball<T>(path: string, apiKey: string): Promise<T | null> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "x-apisports-key": apiKey },
  });
  if (!res.ok) {
    console.error(`[entity] API-Football ${path} -> ${res.status}`);
    return null;
  }
  return (await res.json()) as T;
}

export async function fetchTeamById(
  teamId: number,
  apiKey: string,
): Promise<TeamPageData | null> {
  const json = await apiFootball<TeamsResponse>(`/teams?id=${teamId}`, apiKey);
  const entry = json?.response?.[0];
  const team = entry?.team;
  if (!team?.id) return null;

  const squadJson = await apiFootball<{
    response?: {
      players?: {
        id?: number;
        name?: string;
        age?: number;
        number?: number;
        position?: string;
        photo?: string;
      }[];
    }[];
  }>(`/players/squads?team=${teamId}`, apiKey);

  const squad: SquadPlayer[] = (squadJson?.response?.[0]?.players ?? [])
    .filter((p) => Boolean(p?.id && p?.name))
    .map((p) => ({
      id: p.id as number,
      name: p.name as string,
      age: p.age,
      number: p.number,
      position: p.position,
      photo: p.photo ?? `https://media.api-sports.io/football/players/${p.id}.png`,
    }));

  return {
    id: team.id,
    name: team.name ?? "—",
    logo: team.logo,
    country: team.country,
    founded: team.founded,
    venueName: entry?.venue?.name,
    venueCity: entry?.venue?.city,
    venueCapacity: entry?.venue?.capacity,
    squad,
  };
}

export async function searchTeamsByName(
  query: string,
  apiKey: string,
): Promise<TeamSearchHit[]> {
  const json = await apiFootball<TeamsResponse>(
    `/teams?search=${encodeURIComponent(query)}`,
    apiKey,
  );
  return (json?.response ?? [])
    .map((r) => r.team)
    .filter((tm) => Boolean(tm?.id && tm?.name))
    .slice(0, 12)
    .map((tm) => ({
      id: tm?.id as number,
      name: tm?.name as string,
      logo: tm?.logo,
      country: tm?.country,
    }));
}

/** Resolve a display name (e.g. a local catalogue team) to a live team page. */
export async function fetchTeamByName(
  name: string,
  apiKey: string,
): Promise<TeamPageData | null> {
  const hits = await searchTeamsByName(name, apiKey);
  const hit = hits.find((h) => h.name.toLowerCase() === name.toLowerCase()) ?? hits[0];
  if (!hit) return null;
  return fetchTeamById(hit.id, apiKey);
}
