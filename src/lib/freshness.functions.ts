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
 * Current club of any player. SportMonks has no granted transfers route on the
 * current plan, so this returns null and the UI hides the current-club overlay
 * (rather than showing stale or fabricated data).
 */
export const getPlayerCurrentClub = createServerFn({ method: "GET" })
  .inputValidator((input: { apiPlayerId: number }) => input)
  .handler(async ({ data }): Promise<CachedResult<CurrentClub | null>> => {
    if (!Number.isFinite(data.apiPlayerId)) return { data: null, fetchedAt: null };
    return cachedMeta(
      `current-club:${data.apiPlayerId}`,
      TTL.PLAYER,
      () => fetchCurrentClub(data.apiPlayerId),
      null,
    );
  });

/** Resolve a display name to a provider player id (cached 7 days). */
export const resolveApiPlayerId = createServerFn({ method: "GET" })
  .inputValidator((input: { name: string }) => input)
  .handler(async ({ data }): Promise<{ apiId: number } | null> => {
    const name = data.name.trim();
    if (name.length < 3) return null;
    return cached(
      `player-ref:v2:${name.toLowerCase()}`,
      TTL.STATIC,
      async () => {
        const id = await resolvePlayerIdByName(name);
        return id ? { apiId: id } : null;
      },
      null,
    );
  });

/** Players who joined a team recently ("new signing" badges). */
export const getTeamRecentTransfers = createServerFn({ method: "GET" })
  .inputValidator((input: { teamId: number }) => input)
  .handler(async ({ data }): Promise<TeamInboundTransfer[]> => {
    if (!Number.isFinite(data.teamId)) return [];
    return cached(
      `team-transfers:${data.teamId}`,
      TTL.TRANSFERS,
      () => fetchRecentInboundTransfers(data.teamId),
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
