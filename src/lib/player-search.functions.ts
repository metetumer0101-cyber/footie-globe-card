import { createServerFn } from "@tanstack/react-start";
import { cachedMeta, type CachedResult } from "@/lib/api-cache.server";
import { TTL } from "@/lib/freshness-config";
import { type PlayerCardData, type Tier } from "@/data/football";
import { currentSeason, sportMonks, sportMonksCached, sportMonksCachedMeta, type SportMonksEnvelope, type SportMonksList } from "@/lib/api-sportmonks.server";
import { mapSmPlayerCard, mapSmWorldPlayer, type SMPlayer } from "@/lib/sportmonks.mappers";
import { leagueTopPlayersDb, playerSeasonStatsDb, searchWorldPlayersDb } from "@/lib/player-db.server";
import { isPopularPlayer } from "@/data/player-priority";

export type WorldPlayer = {
  id: number;
  name: string;
  firstname?: string | undefined;
  lastname?: string | undefined;
  age?: number | undefined;
  nationality?: string | undefined;
  /** National flag image URL (player's country resource). */
  flag?: string | undefined;
  position?: string | undefined;
  photo?: string | undefined;
  heightCm?: number | undefined;
  weightKg?: number | undefined;
  club?: string | undefined;
  /** Season goal tally (top-scorer context). */
  goals?: number | undefined;
  /** League name this stat row belongs to. */
  league?: string | undefined;
  /** Set when the entry comes from the built-in FootCard catalogue. */
  localId?: string | undefined;
  /** true when this player is in the popular whitelist. */
  priority?: boolean;
};

export type WorldSearchResult = {
  players: WorldPlayer[];
  source: "api-football" | "mock" | "database";
  paging: { current: number; total: number };
};

/** Honest empty search result — used instead of a fabricated catalogue fallback
 * so the Scout world-search never shows static players as if they were real.
 * Only genuine SportMonks player rows are surfaced. */
function emptySearch(): WorldSearchResult {
  return { players: [], source: "api-football" as const, paging: { current: 1, total: 1 } };
}

/** Search every player indexed worldwide by name (min 3 characters). */
export const searchWorldPlayers = createServerFn({ method: "GET" })
  .inputValidator((input: { query: string; page?: number; leagueId?: number }) => input)
  .handler(async ({ data }): Promise<WorldSearchResult> => {
    const query = data.query.trim();
    const page = data.page ?? 1;
    const leagueId = data.leagueId && data.leagueId > 0 ? data.leagueId : null;
    if (query.length < 3) return { players: [], source: "mock", paging: { current: 1, total: 1 } };

    // Search SportMonks directly (returns provider-native player ids so the
    // player card route resolves).
    return sportMonksCached<WorldSearchResult>(
      `player-search:${query.toLowerCase()}:${leagueId ?? "all"}:${page}`,
      TTL.SEARCH,
      async () => {
        const json = await sportMonks<SportMonksList<SMPlayer>>({
          path: `/players/search/${encodeURIComponent(query)}`,
          // position -> real position name; country -> flag image + nationality.
          // NB: this plan's search include-set has no `stats`/team/league include, so
          // search results can't carry club/league — those stay undefined here (the
          // picker degrades to position · nationality in the subtitle).
          include: ["position", "country"],
          page,
        });
        const players = (json?.data ?? [])
          .map((p) => mapSmWorldPlayer(p))
          .filter((p) => p.id)
          .map((p) => ({
            ...p,
            // Tag popular whitelist players so the picker can rank them first.
            // Match both the display name and firstname+lastname so common_name-
            // style names still resolve.
            priority: isPopularPlayer(p.name) || isPopularPlayer(`${p.firstname ?? ""} ${p.lastname ?? ""}`.trim()),
          }));
        if (!players.length && page === 1) return null;
        const total = json?.meta?.pagination?.total ?? page;
        return {
          players,
          paging: { current: page, total: Math.max(total, 1) },
          source: "api-football" as const,
        };
      },
      emptySearch(),
    );
  });

/** Top scorers of a league — used to browse world players without typing. */
export const getLeagueTopPlayers = createServerFn({ method: "GET" })
  .inputValidator((input: { leagueId: number; season?: number }) => input)
  .handler(async ({ data }): Promise<WorldSearchResult> => {
    // SportMonks v3 has no top-scorers route granted on the current plan
    // (`/top-scorers/*` 404), so there is no honest SportMonks source for
    // "league top players". Serve the local mirror when synced; otherwise return
    // an empty result (callers skip it) rather than mixing provider-agnostic ids.
    const mirrored = await leagueTopPlayersDb(data.leagueId);
    return (
      mirrored ?? { players: [], paging: { current: 1, total: 1 }, source: "api-football" as const }
    );
  });

const clamp = (v: number) => Math.max(35, Math.min(99, Math.round(v)));

function hash(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

function tierFor(score: number): Tier {
  if (score >= 88) return "icon";
  if (score >= 82) return "elite";
  if (score >= 74) return "gold";
  if (score >= 66) return "silver";
  return "bronze";
}

const attrs = (keys: string[], base: number, seed: string) =>
  keys.map((key, i) => ({ key, value: clamp(base + ((hash(seed + key) + i * 7) % 17) - 8) }));

export type WorldPlayerCard = { card: PlayerCardData; source: "api-football" | "mock" };

/** Build a full FootCard profile for any world player id (SportMonks id). */
export const getWorldPlayerCard = createServerFn({ method: "GET" })
  .inputValidator((input: { playerId: number; season?: number }) => input)
  .handler(async ({ data }): Promise<CachedResult<WorldPlayerCard | null>> => {
    // `/players/{id}` — stats/team includes are plan-gated (404), so the card
    // is built from the player's base bio + derived attributes (mapSmPlayerCard).
    // The `playerId` must be a SportMonks player id (as returned by the SM search).
    return sportMonksCachedMeta<WorldPlayerCard | null>(
      `player-card:${data.playerId}:sm`,
      TTL.PLAYER,
      async () => {
        // Real bio includes: position name ("Attacker"), the player's real
        // nationality + flag, and the current-club memberships (`teams.team`)
        // used to derive the player's actual club instead of "Free Agent".
        const json = await sportMonks<SportMonksEnvelope<SMPlayer>>({
          path: `/players/${data.playerId}?include=position;country;nationality;teams.team`,
        });
        const p = json?.data;
        if (!p?.id) return null;
        const card = mapSmPlayerCard(p);
        // "B bridge": fold the local mirror's real season stats (nullable) into the
        // card. Analytics stay plan-gated today, so these read as undefined -> em-dash,
        // but when the sync/plan starts filling goals/assists/appearances they will
        // render real numbers without any provider or UI change.
        const stats = await playerSeasonStatsDb(data.playerId);
        if (stats) {
          card.goals = stats.goals;
          card.assists = stats.assists;
          card.appearances = stats.appearances;
        }
        return { card, source: "api-football" as const };
      },
      null,
    );
  });

/* ---------------- Home page: weekly best, one player per league ---------------- */

export type HomeLeagueBest = {
  league: string;
  player: {
    id: number;
    name: string;
    club?: string | undefined;
    nation?: string | undefined;
    position?: string | undefined;
    photo?: string | undefined;
  };
};

/**
 * The "weekly best of each league" strip for the home page (Rule 3). Pulls the
 * top scorer of a curated set of major leagues — one player per league — from
 * the shared `getLeagueTopPlayers` proxy (itself server-cached).
 *
 * Honest-by-construction: entries whose source falls back to the local mock are
 * skipped, so the page never fabricates a best-player.
 */
const HOME_LEAGUES: { league: string; leagueId: number }[] = [
  { league: "Premier League", leagueId: 39 },
  { league: "La Liga", leagueId: 140 },
  { league: "Serie A", leagueId: 135 },
  { league: "Bundesliga", leagueId: 78 },
  { league: "Ligue 1", leagueId: 61 },
  { league: "Süper Lig", leagueId: 203 },
];

export const getHomeWeeklyBest = createServerFn({ method: "GET" }).handler(
  async (): Promise<HomeLeagueBest[]> => {
    const out: HomeLeagueBest[] = [];
    for (const { league, leagueId } of HOME_LEAGUES) {
      const res = await getLeagueTopPlayers({ data: { leagueId } });
      const p = res?.players?.[0];
      // Skip empty results and any mock fallback — only real API data counts.
      if (!p || res.source === "mock") continue;
      out.push({
        league,
        player: {
          id: p.id,
          name: p.name,
          club: p.club,
          nation: p.nationality,
          position: p.position,
          photo: p.photo,
        },
      });
    }
    return out;
  },
);

/* ---------------- Weekly XI game: real top-scorer pool ---------------- */

export type WeeklyXiEntry = {
  id: number;
  name: string;
  club?: string | undefined;
  league?: string | undefined;
  position?: string | undefined;
  photo?: string | undefined;
  /** Season goal tally — the value the game scores on. */
  goals: number;
};

function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

const WXI_PER_LEAGUE = 8;

/**
 * Builds the Weekly XI game pool from the REAL top scorers of the six major
 * leagues. Honest-by-construction: mock fallbacks are skipped and entries
 * without a numeric goal tally are dropped, so the pool is never fabricated.
 * The pool is returned shuffled so goal counts stay hidden until submit.
 * Quota stays low because it reuses the server-cached getLeagueTopPlayers.
 */
export const getWeeklyXIPool = createServerFn({ method: "GET" }).handler(
  async (): Promise<WeeklyXiEntry[]> => {
    const seen = new Map<number, WeeklyXiEntry>();
    for (const { league, leagueId } of HOME_LEAGUES) {
      const res = await getLeagueTopPlayers({ data: { leagueId } });
      if (!res || res.source === "mock") continue;
      for (const p of res.players.slice(0, WXI_PER_LEAGUE)) {
        if (typeof p.goals !== "number" || !Number.isFinite(p.goals)) continue;
        const existing = seen.get(p.id);
        // Dedupe across leagues keeping the higher goal tally.
        if (!existing || p.goals > existing.goals) {
          seen.set(p.id, {
            id: p.id,
            name: p.name,
            club: p.club,
            league: p.league ?? league,
            position: p.position,
            photo: p.photo,
            goals: p.goals,
          });
        }
      }
    }
    return shuffle([...seen.values()]);
  },
);
