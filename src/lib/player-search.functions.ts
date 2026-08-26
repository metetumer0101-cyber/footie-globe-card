import { createServerFn } from "@tanstack/react-start";
import { cachedMeta, type CachedResult } from "@/lib/api-cache.server";
import { TTL } from "@/lib/freshness-config";
import { type ManagerCardData, type PlayerCardData, type Tier } from "@/data/football";
import { currentSeason, sportMonks, sportMonksCached, sportMonksCachedMeta, type SportMonksEnvelope, type SportMonksList } from "@/lib/api-sportmonks.server";
import { mapSmManagerCard, mapSmPlayerCard, mapSmWorldPlayer, SM_POSITION_NAMES, type SMCoach, type SMPlayer } from "@/lib/sportmonks.mappers";
import { leagueTopPlayersDb, playerSeasonStatsDb, searchWorldPlayersDb, worldPlayerPoolDb } from "@/lib/player-db.server";
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

/* ---------------- Squad Builder: real auto-fill pool ---------------- */

export type SquadPoolPlayer = {
  /** SportMonks player id (resolves via `getWorldPlayerCard`). */
  smId: number;
  name: string;
  /** Coarse position code understood by `roleFit` (GK/DF/MF/ST). */
  position: "GK" | "DF" | "MF" | "ST";
  rating?: number | undefined;
  club?: string | undefined;
  nationality?: string | undefined;
  photo?: string | undefined;
};

/**
 * Normalise the local mirror's `position` column (a mix of names like
 * "Goalkeeper" and raw SportMonks position ids "24".."27") into the coarse
 * FootCard code `roleFit` understands.
 */
function coarsePosition(raw?: string | null): "GK" | "DF" | "MF" | "ST" {
  const v = (raw ?? "").trim();
  if (!v) return "ST";
  const name = (SM_POSITION_NAMES[Number(v)] ?? v).toLowerCase();
  if (name.startsWith("goal") || name === "24") return "GK";
  if (name.startsWith("def") || name === "25") return "DF";
  if (name.startsWith("mid") || name === "26") return "MF";
  return "ST";
}

/** How many players to keep per coarse bucket (gives ~1 GK + a deep outfield mix). */
const POOL_PER_BUCKET: Record<SquadPoolPlayer["position"], number> = {
  GK: 8,
  DF: 33,
  MF: 33,
  ST: 33,
};

/**
 * A position-diverse pool of REAL players for Squad Builder auto-fill, read
 * from the local `world_players` mirror (quota-free). Falls back to an empty
 * pool rather than fabricating players — the caller's auto-fill simply fills
 * fewer slots if the mirror is not yet synced.
 */
export const getSquadPlayerPool = createServerFn({ method: "GET" }).handler(
  async (): Promise<SquadPoolPlayer[]> => {
    const rows = await worldPlayerPoolDb();
    const buckets: Record<SquadPoolPlayer["position"], SquadPoolPlayer[]> = {
      GK: [],
      DF: [],
      MF: [],
      ST: [],
    };
    for (const r of rows) {
      const pos = coarsePosition(r.position);
      if (buckets[pos].length < POOL_PER_BUCKET[pos]) {
        buckets[pos].push({
          smId: r.smId,
          name: r.name,
          position: pos,
          rating: r.rating ?? undefined,
          club: r.club ?? undefined,
          nationality: r.nationality ?? undefined,
          photo: r.photo ?? undefined,
        });
      }
    }
    // Keep buckets shuffled so repeated auto-fills vary, while preserving
    // role-fit selection (the caller re-sorts by fit anyway).
    return shuffle([...buckets.GK, ...buckets.DF, ...buckets.MF, ...buckets.ST]);
  },
);

/* ---------------- Squad Builder: real manager selection ---------------- */

export type WorldManager = {
  id: number;
  name: string;
  nation?: string | undefined;
  /** National flag image URL. */
  flag?: string | undefined;
  club?: string | undefined;
  photo?: string | undefined;
};

export type WorldManagerSearchResult = {
  managers: WorldManager[];
  source: "api-football" | "mock";
  paging: { current: number; total: number };
};

/** Current club name for a coach from its teams include (provider-native). */
function smCoachClubName(c: SMCoach): string | undefined {
  const rows = (Array.isArray(c.teams) ? c.teams : []).filter((r) => r?.team?.id != null);
  if (!rows.length) return undefined;
  return [...rows]
    .sort((a, b) => new Date(b.start ?? 0).getTime() - new Date(a.start ?? 0).getTime())[0]?.team
    ?.name;
}

/** Live coach search by name (min 3 chars) against SportMonks `/coaches`. */
export const searchWorldManagers = createServerFn({ method: "GET" })
  .inputValidator((input: { query: string; page?: number }) => input)
  .handler(async ({ data }): Promise<WorldManagerSearchResult> => {
    const query = data.query.trim();
    if (query.length < 3) {
      return { managers: [], source: "mock", paging: { current: 1, total: 1 } };
    }
    return sportMonksCached<WorldManagerSearchResult>(
      `manager-search:${query.toLowerCase()}:${data.page ?? 1}`,
      TTL.SEARCH,
      async () => {
        const json = await sportMonks<SportMonksList<SMCoach>>({
          path: `/coaches/search/${encodeURIComponent(query)}`,
          include: ["country", "nationality", "teams.team"],
          page: data.page ?? 1,
        });
        const managers = (json?.data ?? [])
          .filter((c) => c.id != null)
          .map((c) => ({
            id: c.id as number,
            name: getDisplayName(c),
            nation: c.nationality?.name ?? c.country?.name,
            flag: c.nationality?.image_path ?? c.country?.image_path,
            club: smCoachClubName(c),
            photo: c.image_path,
          }));
        return {
          managers,
          paging: { current: data.page ?? 1, total: Math.max(1, json?.meta?.pagination?.total ?? 1) },
          source: "api-football" as const,
        };
      },
      { managers: [], source: "mock", paging: { current: 1, total: 1 } },
    );
  });

export type WorldManagerCard = { card: ManagerCardData; source: "api-football" | "mock" };

/** Build a full FootCard manager profile from a SportMonks `/coaches/{id}` id. */
export const getWorldManagerCard = createServerFn({ method: "GET" })
  .inputValidator((input: { coachId: number }) => input)
  .handler(async ({ data }): Promise<CachedResult<WorldManagerCard | null>> => {
    return sportMonksCachedMeta<WorldManagerCard | null>(
      `manager-card:${data.coachId}:sm`,
      TTL.PLAYER,
      async () => {
        const json = await sportMonks<SportMonksEnvelope<SMCoach>>({
          path: `/coaches/${data.coachId}?include=country;nationality;teams.team`,
        });
        const c = json?.data;
        if (!c?.id) return null;
        return { card: mapSmManagerCard(c), source: "api-football" as const };
      },
      null,
    );
  });

function getDisplayName(c: SMCoach): string {
  return c.display_name ?? c.common_name ?? c.name ?? `${c.firstname ?? ""} ${c.lastname ?? ""}`.trim();
}
