import { createServerFn } from "@tanstack/react-start";
import {
  bustCache,
  cached,
  cachedMeta,
  readCache,
  writeCache,
  type CachedResult,
} from "@/lib/api-cache.server";
import { TTL } from "@/lib/freshness-config";
import {
  fetchCurrentClub,
  fetchRecentInboundTransfers,
  resolvePlayerIdByName,
  type CurrentClub,
  type TeamInboundTransfer,
} from "@/lib/freshness.server";

/**
 * Current club of any player, derived from their latest transfer (the
 * freshest upstream signal). Cached for 1 hour.
 */
export const getPlayerCurrentClub = createServerFn({ method: "GET" })
  .inputValidator((input: { apiPlayerId: number }) => input)
  .handler(async ({ data }): Promise<CachedResult<CurrentClub | null>> => {
    const apiKey = process.env["API_FOOTBALL_KEY"];
    if (!apiKey || !Number.isFinite(data.apiPlayerId)) return { data: null, fetchedAt: null };
    return cachedMeta(
      `current-club:${data.apiPlayerId}`,
      TTL.PLAYER,
      () => fetchCurrentClub(data.apiPlayerId, apiKey),
      null,
    );
  });

/** Resolve a catalogue display name to an API-Football player id (cached 7 days). */
export const resolveApiPlayerId = createServerFn({ method: "GET" })
  .inputValidator((input: { name: string }) => input)
  .handler(async ({ data }): Promise<{ apiId: number } | null> => {
    const apiKey = process.env["API_FOOTBALL_KEY"];
    const name = data.name.trim();
    if (!apiKey || name.length < 3) return null;
    // v2: stricter matching — bumps the key so stale v1 resolutions are ignored.
    return cached(
      `player-ref:v2:${name.toLowerCase()}`,
      TTL.STATIC,
      async () => {
        const id = await resolvePlayerIdByName(name, apiKey);
        return id ? { apiId: id } : null;
      },
      null,
    );
  });

/** Players who joined a team within the last 45 days ("new signing" badges). */
export const getTeamRecentTransfers = createServerFn({ method: "GET" })
  .inputValidator((input: { teamId: number }) => input)
  .handler(async ({ data }): Promise<TeamInboundTransfer[]> => {
    const apiKey = process.env["API_FOOTBALL_KEY"];
    if (!apiKey || !Number.isFinite(data.teamId)) return [];
    return cached(
      `team-transfers:${data.teamId}`,
      TTL.TRANSFERS,
      () => fetchRecentInboundTransfers(data.teamId, apiKey),
      [],
    );
  });

/**
 * Manual cache bust for a player or team page. Rate-limited to one refresh
 * per entity per 60 seconds via a short-lived ticket entry.
 */
export const refreshEntity = createServerFn({ method: "POST" })
  .inputValidator(
    (input: { kind: "player" | "team"; id: string; apiId?: number; name?: string }) => input,
  )
  .handler(async ({ data }): Promise<{ ok: boolean; retryAfterSeconds?: number }> => {
    const ticketKey = `refresh-ticket:${data.kind}:${data.id}`;
    const ticket = await readCache(ticketKey);
    if (ticket) return { ok: false, retryAfterSeconds: 60 };

    const keys: string[] = [];
    const prefixes: string[] = [];
    if (data.kind === "player") {
      if (data.apiId && Number.isFinite(data.apiId)) {
        keys.push(`current-club:${data.apiId}`, `transfers:${data.apiId}`);
        prefixes.push(`player-card:${data.apiId}:`);
      }
      if (data.name) prefixes.push("player-ref:");
    } else {
      if (data.apiId && Number.isFinite(data.apiId)) {
        keys.push(`team:${data.apiId}`, `team-transfers:${data.apiId}`);
      }
      if (data.name) keys.push(`team-name:${data.name.trim().toLowerCase()}`);
    }
    await bustCache(keys, prefixes);
    await writeCache(ticketKey, { at: Date.now() }, 60);
    return { ok: true };
  });
