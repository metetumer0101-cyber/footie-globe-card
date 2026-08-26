import { createServerFn } from "@tanstack/react-start";
import { type LiveFeed, type LiveFixture, type TransferHistory, type TransferMove } from "@/lib/live";
import { TTL } from "@/lib/freshness-config";
import { sportMonks, sportMonksCached, type SportMonksList } from "@/lib/api-sportmonks.server";
import { mapSmFixture, mapSmInplayFixture, type SMFixture, type SMInplayFixture } from "@/lib/sportmonks.mappers";
import { isQuotaExhausted } from "@/lib/system-status.server";
import { ensureMidnightRefresh } from "@/lib/midnight-refresh.server";
import { utcDateKey } from "@/services/dailyEngine";

const LIVE_SNAPSHOT_TTL = 30;
/** How many days ahead (beyond today) the live feed window covers. */
const FEED_WINDOW_DAYS = 4;

/**
 * A feed with no fixtures — used as the honest "no live data" state instead of
 * a fabricated local mock. Consumers (e.g. the home page) treat an empty
 * fixtures list as "no real live data to show" and never invent scores. The
 * `quotaExhausted` flag lets them show a clear quota empty-state card.
 */
function emptyFeed(): LiveFeed {
  return {
    date: utcDateKey(new Date()),
    source: "api-football",
    fixtures: [],
    quotaExhausted: isQuotaExhausted(),
  };
}

/**
 * SportMonks-backed live feed. Uses `/fixtures/date/{date}` for the daily
 * schedule (which on this plan also includes in-play matches, so it doubles as
 * the live view). `/fixtures/live` requires undocumented params and 422s on the
 * current plan, so it's attempted and safely ignored when it fails. Team names
 * are parsed from the composite `name` field because the `localTeam`/`visitorTeam`
 * includes are plan-gated (404). Scores/`time` are only present when those
 * includes are granted, so the mapper falls back to 0 / no-minute defensively.
 */
export const getLiveFeed = createServerFn({ method: "GET" }).handler(async (): Promise<LiveFeed> => {
  // Any live-feed request keeps the UTC-midnight cache invalidation + warm
  // refresh timer armed, so the daily quota reset is handled automatically.
  ensureMidnightRefresh();
  const now = new Date();
  const from = utcDateKey(now);
  const to = utcDateKey(new Date(now.getTime() + FEED_WINDOW_DAYS * 86400000));
  return getLiveFeedSportMonks(from, to);
});
async function getLiveFeedSportMonks(from: string, to: string): Promise<LiveFeed> {
  const map = (rows: SMFixture[], prefix: string) => rows.map((r, i) => mapSmFixture(r, `${prefix}-${i}`));
  // SportMonks v3 has NO `/fixtures/live` endpoint — that path is interpreted as
  // `/fixtures/{id}` (id="live") and 422s ("The fixture id must be an integer").
  // Instead a single `/fixtures/between/{from}/{to}` call covers the whole rolling
  // window (today..today+4) and includes those days' in-play matches too, so it
  // doubles as the live view. `mapSmFixture` derives per-fixture live/HT/FT status
  // from `state_id`/`time`, so fixtures actually in play surface as live.
  const window = await sportMonksCached<LiveFixture[] | null>(
    `fixtures-window:${from}:${to}`,
    TTL.FIXTURES,
    async () => {
      const json = await sportMonks<SportMonksList<SMFixture>>({
        path: `/fixtures/between/${from}/${to}`,
        include: ["league"],
      });
      const rows = json?.data ?? [];
      if (!rows.length) return null;
      return map(rows, `${from}-${to}`);
    },
    null,
  );
  if (!window?.length) return emptyFeed();
  return { date: from, source: "api-football", fixtures: window, quotaExhausted: isQuotaExhausted() };
}

/**
 * SportMonks-backed in-play feed for the live page (part 1 of the live-page
 * redesign — data layer only; the UI redesign consumes this in a follow-up).
 * Backed by `GET /livescores/inplay` with a SHORT ttl (~30s) so scores/periods
 * stay fresh while in play.
 */
const INPLAY_TTL_S = 30;

export const getInplayFeed = createServerFn({ method: "GET" }).handler(async (): Promise<LiveFeed> => {
  ensureMidnightRefresh();
  const fixtures = await sportMonksCached<LiveFixture[] | null>(
    "inplay:feed",
    INPLAY_TTL_S,
    async () => {
      // The in-play endpoint's envelope is `{ data: [...] }` (NOT `{data, meta}`),
      // so it's typed as `{ data: T[] }` rather than `SportMonksList`.
      const json = await sportMonks<{ data: SMInplayFixture[] }>({
        path: "/livescores/inplay",
        include: ["league", "participants", "scores", "periods", "events"],
      });
      const rows = json?.data ?? [];
      if (!rows.length) return null;
      return rows.map((r, i) => mapSmInplayFixture(r, `inplay-${i}`));
    },
    null,
  );
  if (!fixtures?.length) return emptyFeed();
  return {
    date: utcDateKey(new Date()),
    source: "api-football",
    fixtures,
    quotaExhausted: isQuotaExhausted(),
  };
});

/** A raw SportMonks transfer row (`/transfers/players/{id}`). Team ids are
 * resolved to real names below so the timeline shows clubs, not raw ids. */
type SMTransferRow = {
  from_team_id?: number | null;
  to_team_id?: number | null;
  date?: string | null;
};

/**
 * Historical transfer data for a player, from the SportMonks
 * `/transfers/players/{id}` endpoint (NOTE: plural "players" — the singular
 * `/transfers/player/{id}` 404s). Each transfer's from/to team ids are resolved
 * to real club names. Returns an honest empty history when the API returns no
 * rows rather than the local mock, so no fabricated moves ever show.
 */
export const getPlayerTransfers = createServerFn({ method: "GET" })
  .inputValidator((input: { playerId: string; apiPlayerId?: number }) => input)
  .handler(async ({ data }): Promise<TransferHistory> => {
    const empty: TransferHistory = { playerId: data.playerId, source: "api-football", moves: [] };
    if (!data.apiPlayerId) return empty;
    const json = await sportMonks<{ data?: SMTransferRow[] | null }>({
      path: `/transfers/players/${data.apiPlayerId}`,
    });
    const rows = json?.data ?? [];
    if (!rows.length) return empty;
    // Resolve the involved teams' ids to real club names (deduped, in parallel).
    const ids = [
      ...new Set(
        rows.flatMap((r) => [r.from_team_id, r.to_team_id]).filter((x): x is number => x != null),
      ),
    ];
    const names = new Map<number, string>();
    await Promise.all(
      ids.map(async (id) => {
        const t = await sportMonks<{ data?: { name?: string } | null }>({ path: `/teams/${id}` });
        const name = t?.data?.name;
        if (name) names.set(id, name);
      }),
    );
    const nameOf = (id?: number | null) =>
      id != null ? (names.get(id) ?? `Team ${id}`) : "Unknown";
    const moves: TransferMove[] = rows
      .map((r) => ({
        date: r.date ?? "",
        from: nameOf(r.from_team_id),
        to: nameOf(r.to_team_id),
      }))
      .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
    return { playerId: data.playerId, source: "api-football", moves };
  });
