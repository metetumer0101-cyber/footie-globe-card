/**
 * Server-only helpers for the freshness layer.
 *
 * The "freshness" features (current club, name→id resolution, recent inbound
 * transfers) were all built on the API-Football `/transfers`+`/players/profiles`
 * endpoints. The API-Football client was removed in Step 4 (cleanup). SportMonks
 * has no transfers route granted on the current plan (`/transfers/*` 404), so
 * these helpers now return an honest empty result rather than stale or
 * fabricated data — the UI hides the affected overlays.
 *
 * Imported exclusively by src/lib/freshness.functions.ts (the thin wrapper).
 */

export type CurrentClub = {
  apiPlayerId: number;
  club: string;
  teamId?: number | undefined;
  logo?: string | undefined;
  since?: string | undefined;
  from?: string | undefined;
};

/** Latest known club of a player — no granted SportMonks transfers route. */
export async function fetchCurrentClub(apiPlayerId: number): Promise<CurrentClub | null> {
  void apiPlayerId;
  return null;
}

/**
 * Resolve a display name to a provider player id. SportMonks player ids take a
 * separate namespace and no resolver is wired yet — return null (caller hides
 * the overlay).
 */
export async function resolvePlayerIdByName(name: string): Promise<number | null> {
  void name;
  return null;
}

export type TeamInboundTransfer = {
  playerId: number;
  playerName: string;
  date: string;
  fromTeam?: string | undefined;
};

/** Players who joined the team recently — no granted SportMonks transfers route. */
export async function fetchRecentInboundTransfers(teamId: number): Promise<TeamInboundTransfer[]> {
  void teamId;
  return [];
}
