import { createServerFn } from "@tanstack/react-start";
import { cached } from "@/lib/api-cache.server";
import { TTL } from "@/lib/freshness-config";
import {
  apiFootball,
  apiFootballKey,
  currentSeason,
  seasonCandidates,
} from "@/lib/api-football.server";
import {
  isSportMonksEnabled,
  sportMonks,
  type SportMonksList,
} from "@/lib/api-sportmonks.server";
import { mapSmFixture, type SMFixture } from "@/lib/sportmonks.mappers";
import { mapFixtureRow, type ApiFootballFixture, type LiveFixture } from "@/lib/live";

/**
 * Rule 2 — real "next / previous" match for the user's favorite team.
 *
 * The live feed only carries *today's* fixtures plus in-play matches, so a team
 * with no game today would show nothing. This resolves the team's own season
 * fixture list from API-Football and derives the closest upcoming (next) and
 * most recent finished (prev) match from it, so the section renders no matter
 * when the team last played or next plays.
 *
 * Real API data only — no demo/mock fallback. If nothing is found, `next` and
 * `prev` are simply omitted and the caller shows an honest empty state.
 */

export type FavoriteTeamMatchesResult = {
  teamId: number;
  season: number;
  next?: LiveFixture;
  prev?: LiveFixture;
  source: "api-football";
};

export const getFavoriteTeamMatches = createServerFn({ method: "GET" })
  .inputValidator((input: { teamId: number }) => input)
  .handler(async ({ data }): Promise<FavoriteTeamMatchesResult> => {
    const teamId = data.teamId;

    if (isSportMonksEnabled()) {
      // Best-effort `/fixtures` filtered by team. On the current plan `filter[...]`
      // returns "Filters should be passed as a string" (HTTP 400), so this yields
      // no rows and we honestly return no next/prev rather than fabricating one.
      const result = await cached<FavoriteTeamMatchesResult | null>(
        `team-fixtures:${teamId}:sm`,
        TTL.FIXTURES,
        async () => {
          const json = await sportMonks<SportMonksList<SMFixture>>({
            path: "/fixtures",
            filters: { localteam_id: teamId, visitorteam_id: teamId },
            include: ["league"],
          });
          const rows = json?.data ?? [];
          if (!rows.length) return null;

          const now = Date.now();
          let next: { fixture: LiveFixture; at: number } | null = null;
          let prev: { fixture: LiveFixture; at: number } | null = null;
          for (let i = 0; i < rows.length; i++) {
            const f = rows[i];
            const at = f.starting_at ? new Date(f.starting_at).getTime() : NaN;
            if (!Number.isFinite(at)) continue;
            const mapped = mapSmFixture(f, `tm-${teamId}-${i}`);
            if (mapped.status === "scheduled") {
              if (at >= now && (!next || at < next.at)) next = { fixture: mapped, at };
            } else if (mapped.status === "live" || mapped.status === "halftime") {
              if (at >= now - 3 * 60 * 60 * 1000 && (!next || at < next.at)) next = { fixture: mapped, at };
            } else if (mapped.status === "finished") {
              if (at <= now && (!prev || at > prev.at)) prev = { fixture: mapped, at };
            }
          }
          return {
            teamId,
            season: currentSeason(),
            source: "api-football",
            next: next?.fixture,
            prev: prev?.fixture,
          };
        },
        null,
      );
      if (result && (result.prev || result.next)) return result;
      return { teamId, season: currentSeason(), source: "api-football" };
    }

    const apiKey = apiFootballKey();
    if (!apiKey || !Number.isFinite(teamId)) {
      return { teamId, season: currentSeason(), source: "api-football" };
    }

    // Try the newest season first, then older ones the free tier can still serve
    // (API-Football's free plan only exposes 2022–2024; the current 2025 season
    // requires a paid plan). We use the first season that actually yields data so
    // the section renders real fixtures instead of silently returning nothing.
    for (const season of seasonCandidates()) {
      const result = await cached<FavoriteTeamMatchesResult | null>(
        `team-fixtures:${teamId}:${season}`,
        TTL.FIXTURES,
        async () => {
          const json = await apiFootball<{ response?: ApiFootballFixture[] }>(
            `/fixtures?team=${teamId}&season=${season}`,
            apiKey,
          );
          const rows = json?.response ?? [];
          // Free-tier/no-data errors come through as an empty response — treat as
          // "not available for this season" so we can fall through to the next one.
          if (!rows.length) return null;

          const now = Date.now();
          let next: { fixture: LiveFixture; at: number } | null = null;
          let prev: { fixture: LiveFixture; at: number } | null = null;

          for (let i = 0; i < rows.length; i++) {
            const f = rows[i];
            const at = f?.fixture?.date ? new Date(f.fixture.date).getTime() : NaN;
            if (!Number.isFinite(at)) continue;
            const mapped = mapFixtureRow(f, `tm-${teamId}-${i}`);

            if (mapped.status === "scheduled") {
              // closest upcoming match (kickoff at/after now, nearest in future)
              if (at >= now && (!next || at < next.at)) next = { fixture: mapped, at };
            } else if (mapped.status === "live" || mapped.status === "halftime") {
              // an in-progress game is arguably the team's "current" match — prefer
              // it over an upcoming one only when no future scheduled game is closer.
              if (at >= now - 3 * 60 * 60 * 1000 && (!next || at < next.at)) {
                next = { fixture: mapped, at };
              }
            } else if (mapped.status === "finished") {
              // most recent completed match (past, nearest to now)
              if (at <= now && (!prev || at > prev.at)) prev = { fixture: mapped, at };
            }
          }

          return {
            teamId,
            season,
            source: "api-football",
            next: next?.fixture,
            prev: prev?.fixture,
          };
        },
        null,
      );
      if (result && (result.prev || result.next)) return result;
    }

    return { teamId, season: currentSeason(), source: "api-football" };
  });
