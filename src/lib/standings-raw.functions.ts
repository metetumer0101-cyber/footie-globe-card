import { createServerFn } from "@tanstack/react-start";
import { TTL } from "@/lib/freshness-config";
import {
  resolveSeasonId,
  sportMonks,
  sportMonksCached,
  type SportMonksList,
} from "@/lib/api-sportmonks.server";
import type { SportmonksStandingRow } from "@/types/standings";

/**
 * Raw SportMonks standings rows for a league, used by the Games/Standings tab
 * which parses `details` type-ids itself via `parseSportmonksStandings`.
 * Returns an empty array when the plan/season has no data — never fabricated.
 */
export const getRawStandings = createServerFn({ method: "GET" })
  .inputValidator((input: { leagueId: number }) => input)
  .handler(async ({ data }): Promise<SportmonksStandingRow[]> => {
    const seasonId = await resolveSeasonId(data.leagueId);
    if (seasonId == null) return [];
    const rows = await sportMonksCached<SportmonksStandingRow[] | null>(
      `standings-raw:${seasonId}`,
      TTL.STANDINGS,
      async () => {
        const json = await sportMonks<SportMonksList<SportmonksStandingRow>>({
          path: `/standings/seasons/${seasonId}`,
          include: ["participant", "details"],
        });
        const list = json?.data ?? [];
        return list.length ? list : null;
      },
      null,
    );
    return rows ?? [];
  });
