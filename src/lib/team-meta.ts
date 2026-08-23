/**
 * Client-side record of a favorite team's display identity.
 *
 * `favorites` persists only an entity id (the API-Football team id) so we keep
 * a tiny local mirror of {id, name, logo, country} here so the home page can
 * render the team's name/crest and match its fixtures without extra lookups.
 * Keyed by the same id string stored in favorites.teams.
 */

export type FavoriteTeamMeta = {
  id: string;
  name: string;
  logo?: string | undefined;
  country?: string | undefined;
};

const KEY = "footcard:fav-team-meta";

function readRaw(): Record<string, FavoriteTeamMeta> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, FavoriteTeamMeta>;
    return typeof parsed === "object" && parsed ? parsed : {};
  } catch {
    return {};
  }
}

function writeRaw(map: Record<string, FavoriteTeamMeta>) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(map));
  } catch {
    /* ignore */
  }
}

export function saveTeamMeta(meta: FavoriteTeamMeta) {
  const map = readRaw();
  map[meta.id] = meta;
  writeRaw(map);
}

export function favoriteTeamMetaFor(id: string): FavoriteTeamMeta | undefined {
  return readRaw()[id];
}
