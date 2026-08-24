import { createServerFn } from "@tanstack/react-start";
import { cached } from "@/lib/api-cache.server";
import { TTL } from "@/lib/freshness-config";
import { currentSeason, sportMonks, type SportMonksList } from "@/lib/api-sportmonks.server";
import { mapSmFixture, type SMFixture } from "@/lib/sportmonks.mappers";
import type { LiveFixture } from "@/lib/live";

/**
 * Rule 2 — real "next / previous" match for the user's favorite team.
 *
 * The live feed only carries *today's* fixtures plus in-play matches, so a team
 * with no game today would show nothing. This resolves the team's own fixture
 * list from SportMonks and derives the closest upcoming (next) and most recent
 * finished (prev) match from it, so the section renders no matter when the team
 * last played or next plays.
 *
 * HOW THIS WORKS ON THE CURRENT SportMonks PLAN (verified against the live
 * token, 2026-08-24):
 *  - There is NO server-side team filter on `/fixtures`: `filter[localteam_id]` /
 *    `filter[visitorteam_id]` → 400 "Filters should be passed as a string", and
 *    `filters=team_ids:X` / `filter=team_id:X` are accepted but silently return
 *    every fixture (ignored). So we cannot ask SportMonks for "team X's fixtures".
 *  - Worse, the base `/fixtures/between/{from}/{to}` list rows carry
 *    `localteam_id`/`visitorteam_id` as `null` on this plan, so we cannot even
 *    filter client-side by those ids.
 *  - The include `?include=participants` DOES resolve and embeds the real team
 *    id + name + logo per fixture (participants[].id, meta.location home/away).
 *    So the reliable, plan-compatible approach is: fetch a date-bounded
 *    `/fixtures/between/{from}/{to}?include=participants;league` window and
 *    filter client-side by whether any participant id matches the favorite team.
 *  - Fixture state on this plan: state 1 = scheduled, state 5 = **finished** on
 *    past fixtures (verified: an ended match, e.g. Arsenal 3-0, reports state 5,
 *    NOT 6 — the shared mapper's "5 = live" assumption does not hold here, so we
 *    classify directly in this function and override the mapped status).
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

/** State-5 came back as "finished" for past matches on this plan (verified). */
const HOUR = 3_600_000;
const LIVE_WINDOW_MS = 3 * HOUR; // a kickoff within the last 3h may still be in-play
const PER_PAGE = 50;
// Hard cap on pages scanned per direction so a request always terminates even
// on dense global fixture ranges. Results are cached, so this cost only hits
// once per TTL per team.
const MAX_PAGES = 20;

type SMParticipant = { id?: number; name?: string; image_path?: string; meta?: { location?: string } };
type SMFixtureRow = SMFixture & { participants?: SMParticipant[] };

function involvesTeam(f: SMFixtureRow, teamId: number): boolean {
  return (f.participants ?? []).some((p) => Number(p?.id) === teamId);
}

/**
 * Classify a SportMonks fixture into the app's coarse status, using the
 * verified state semantics for this plan (state 1 = scheduled, state 5 =
 * finished for past matches). Overrides the shared mapper for state 5, which
 * the shared mapper mislabels as "live".
 */
function smStatus(f: SMFixtureRow): LiveFixture["status"] {
  const state = f.state_id;
  const at = f.starting_at ? new Date(f.starting_at).getTime() : NaN;
  const now = Date.now();
  if (state === 1) return "scheduled";
  if (state === 6 || state === 7) return "finished";
  if (state === 5) {
    // A kickoff within the last 3h may be in progress; anything older is done.
    return Number.isFinite(at) && at >= now - LIVE_WINDOW_MS ? "live" : "finished";
  }
  if (Number.isFinite(at)) return at <= now ? "finished" : "scheduled";
  return "scheduled";
}

function toDateISO(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * Fetch one date-bounded window of fixtures (with participant + league embeds)
 * and page through it, yielding only the rows belonging to `teamId`.
 */
async function teamFixturesInWindow(
  fromISO: string,
  toISO: string,
  teamId: number,
  earlyExit: boolean,
  forNext: boolean,
): Promise<SMFixtureRow[]> {
  const matches: SMFixtureRow[] = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    const json = await sportMonks<SportMonksList<SMFixtureRow>>({
      path: `/fixtures/between/${fromISO}/${toISO}`,
      include: ["participants", "league"],
      perPage: PER_PAGE,
      page,
    });
    const rows = json?.data ?? [];
    if (!rows.length) break;
    const now = Date.now();
    for (const f of rows) {
      if (!involvesTeam(f, teamId)) continue;
      const at = f.starting_at ? new Date(f.starting_at).getTime() : NaN;
      if (!Number.isFinite(at)) continue;
      const status = smStatus(f);
      if (forNext) {
        // upcoming: scheduled in the (near) future, or currently in-play
        if ((status === "scheduled" || status === "live" || status === "halftime") && at >= now - LIVE_WINDOW_MS) {
          matches.push(f);
        }
      } else {
        // recent finished: played and already over
        if (status === "finished" && at <= now) {
          matches.push(f);
        }
      }
    }
    const hasMore = json?.meta?.pagination?.has_more ?? false;
    if (earlyExit && matches.length > 0) break; // ascending order -> first hit is the closest
    if (!hasMore) break;
  }
  return matches;
}

export const getFavoriteTeamMatches = createServerFn({ method: "GET" })
  .inputValidator((input: { teamId: number }) => input)
  .handler(async ({ data }): Promise<FavoriteTeamMatchesResult> => {
    const teamId = data.teamId;
    const result = await cached<FavoriteTeamMatchesResult | null>(
      `team-fixtures:${teamId}:sm`,
      TTL.FIXTURES,
      async () => {
        const now = Date.now();
        // NEXT: closest upcoming fixture in the next two weeks.
        const upcoming = await teamFixturesInWindow(toDateISO(0), toDateISO(14), teamId, true, true);
        let next: { fixture: LiveFixture; at: number } | null = null;
        for (let i = 0; i < upcoming.length; i++) {
          const f = upcoming[i];
          const at = f.starting_at ? new Date(f.starting_at).getTime() : NaN;
          if (!Number.isFinite(at)) continue;
          if (next === null || at < next.at) {
            next = { fixture: { ...mapSmFixture(f, `tm-${teamId}-next-${i}`), status: smStatus(f) }, at };
          }
        }

        // PREV: most recent finished match in the last week (window must be
        // fully scanned; ascending order puts the newest at the end).
        const finished = await teamFixturesInWindow(toDateISO(-7), toDateISO(0), teamId, false, false);
        let prev: { fixture: LiveFixture; at: number } | null = null;
        for (let i = 0; i < finished.length; i++) {
          const f = finished[i];
          const at = f.starting_at ? new Date(f.starting_at).getTime() : NaN;
          if (!Number.isFinite(at)) continue;
          if (prev === null || at > prev.at) {
            prev = { fixture: { ...mapSmFixture(f, `tm-${teamId}-prev-${i}`), status: smStatus(f) }, at };
          }
        }

        if (!next && !prev) return null;
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
  });
