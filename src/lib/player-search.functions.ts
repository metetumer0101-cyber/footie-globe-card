import { createServerFn } from "@tanstack/react-start";
import { cached, cachedMeta, type CachedResult } from "@/lib/api-cache.server";
import { TTL } from "@/lib/freshness-config";
import { players as mockPlayers, type PlayerCardData, type Tier } from "@/data/football";
import { apiFootball, apiFootballKey, currentSeason, seasonCandidates } from "@/lib/api-football.server";
import { leagueTopPlayersDb, searchWorldPlayersDb } from "@/lib/player-db.server";

export type WorldPlayer = {
  id: number;
  name: string;
  firstname?: string | undefined;
  lastname?: string | undefined;
  age?: number | undefined;
  nationality?: string | undefined;
  position?: string | undefined;
  photo?: string | undefined;
  heightCm?: number | undefined;
  weightKg?: number | undefined;
  club?: string | undefined;
  /** Set when the entry comes from the built-in FootCard catalogue. */
  localId?: string | undefined;
};

export type WorldSearchResult = {
  players: WorldPlayer[];
  source: "api-football" | "mock" | "database";
  paging: { current: number; total: number };
};

function num(raw?: string | number | null): number | undefined {
  if (raw == null) return undefined;
  const parsed = parseInt(String(raw), 10);
  return Number.isFinite(parsed) ? parsed : undefined;
}

type ProfileResponse = {
  paging?: { current?: number; total?: number };
  response?: {
    player?: {
      id?: number;
      name?: string;
      firstname?: string;
      lastname?: string;
      age?: number;
      nationality?: string;
      height?: string;
      weight?: string;
      photo?: string;
      position?: string;
    };
  }[];
};

function mockSearch(query: string): WorldSearchResult {
  const q = query.trim().toLowerCase();
  return {
    source: "mock",
    paging: { current: 1, total: 1 },
    players: mockPlayers
      .filter((p) => !q || p.name.toLowerCase().includes(q))
      .map((p, i) => ({
        id: 900000 + i,
        localId: p.id,
        club: p.club,
        name: p.name,
        age: p.age,
        nationality: p.nation,
        position: p.position,
        heightCm: p.heightCm,
        weightKg: p.weightKg,
      })),
  };
}

type LeagueSearchResponse = {
  paging?: { current?: number; total?: number };
  response?: {
    player?: {
      id?: number;
      name?: string;
      firstname?: string;
      lastname?: string;
      age?: number;
      nationality?: string;
      height?: string;
      weight?: string;
      photo?: string;
    };
    statistics?: { team?: { name?: string }; games?: { position?: string } }[];
  }[];
};

/** Search every player indexed worldwide by name (min 3 characters). When a
 * leagueId is given, the search is scoped to that league via the stats
 * endpoint (which also yields club + position for each hit). */
export const searchWorldPlayers = createServerFn({ method: "GET" })
  .inputValidator((input: { query: string; page?: number; leagueId?: number }) => input)
  .handler(async ({ data }): Promise<WorldSearchResult> => {
    const query = data.query.trim();
    const page = data.page ?? 1;
    const leagueId = data.leagueId && data.leagueId > 0 ? data.leagueId : null;
    if (query.length < 3) return { players: [], source: "mock", paging: { current: 1, total: 1 } };

    // Local mirror first: instant, quota-free, covers every synced league.
    const mirrored = await searchWorldPlayersDb({ query, page, leagueId });
    if (mirrored) return mirrored;

    const apiKey = apiFootballKey();
    const fallback = mockSearch(query);
    if (!apiKey) return fallback;

    return cached<WorldSearchResult>(
      `player-search:${query.toLowerCase()}:${leagueId ?? "all"}:${page}`,
      TTL.SEARCH,
      async () => {
        let players: WorldPlayer[] = [];
        let paging = { current: page, total: page };

        if (leagueId) {
          // League-scoped search; walk season candidates for free-tier keys.
          for (const season of seasonCandidates()) {
            const json = await apiFootball<LeagueSearchResponse>(
              `/players?league=${leagueId}&season=${season}&search=${encodeURIComponent(query)}&page=${page}`,
              apiKey,
            );
            const rows = json?.response ?? [];
            if (!rows.length && page === 1) continue;
            players = rows
              .filter((r) => r.player?.id)
              .map((r) => ({
                id: r.player?.id as number,
                name:
                  r.player?.name ??
                  `${r.player?.firstname ?? ""} ${r.player?.lastname ?? ""}`.trim(),
                firstname: r.player?.firstname,
                lastname: r.player?.lastname,
                age: r.player?.age,
                nationality: r.player?.nationality,
                position: r.statistics?.[0]?.games?.position,
                photo: r.player?.photo,
                heightCm: num(r.player?.height?.replace(/\D/g, "")),
                weightKg: num(r.player?.weight?.replace(/\D/g, "")),
                club: r.statistics?.[0]?.team?.name,
              }));
            paging = {
              current: json?.paging?.current ?? page,
              total: Math.max(json?.paging?.total ?? page, 1),
            };
            break;
          }
        } else {
          const json = await apiFootball<ProfileResponse>(
            `/players/profiles?search=${encodeURIComponent(query)}&page=${page}`,
            apiKey,
          );
          players = (json?.response ?? [])
            .map((r) => r.player)
            .filter((p): p is NonNullable<typeof p> => Boolean(p?.id))
            .map((p) => ({
              id: p.id as number,
              name: p.name ?? `${p.firstname ?? ""} ${p.lastname ?? ""}`.trim(),
              firstname: p.firstname,
              lastname: p.lastname,
              age: p.age,
              nationality: p.nationality,
              position: p.position,
              photo: p.photo,
              heightCm: num(p.height?.replace(/\D/g, "")),
              weightKg: num(p.weight?.replace(/\D/g, "")),
            }));
          paging = {
            current: json?.paging?.current ?? page,
            total: Math.max(json?.paging?.total ?? page, 1),
          };
        }

        // Page 1 with zero hits falls back to the local catalogue; an empty
        // page beyond 1 just means the search is exhausted — stop paging.
        if (!players.length && page === 1) return null;
        return { players, paging, source: "api-football" as const };
      },
      fallback,
    );
  });

/** Top scorers of a league — used to browse world players without typing. */
export const getLeagueTopPlayers = createServerFn({ method: "GET" })
  .inputValidator((input: { leagueId: number; season?: number }) => input)
  .handler(async ({ data }): Promise<WorldSearchResult> => {
    // Local mirror first (nightly sync keeps it fresh); API only as fallback.
    const mirrored = await leagueTopPlayersDb(data.leagueId);
    if (mirrored) return mirrored;

    const apiKey = apiFootballKey();
    const season = data.season ?? currentSeason();
    const fallback = mockSearch("");
    if (!apiKey) return fallback;

    return cached<WorldSearchResult>(
      `league-top:${data.leagueId}:${season}`,
      TTL.TOP_PLAYERS,
      async () => {
        const json = await apiFootball<{
          response?: {
            player?: {
              id?: number;
              name?: string;
              age?: number;
              nationality?: string;
              height?: string;
              weight?: string;
              photo?: string;
            };
            statistics?: { team?: { name?: string }; games?: { position?: string } }[];
          }[];
        }>(`/players/topscorers?league=${data.leagueId}&season=${season}`, apiKey);
        let rows = json?.response ?? [];
        for (const alt of seasonCandidates(season)) {
          if (rows.length) break;
          const retry = await apiFootball<typeof json>(
            `/players/topscorers?league=${data.leagueId}&season=${alt}`,
            apiKey,
          );
          rows = retry?.response ?? [];
        }
        const list = (rows ?? [])
          .filter((r) => r.player?.id)
          .map((r) => ({
            id: r.player?.id as number,
            name: r.player?.name ?? "—",
            age: r.player?.age,
            nationality: r.player?.nationality,
            position: r.statistics?.[0]?.games?.position,
            photo: r.player?.photo,
            heightCm: num(r.player?.height?.replace(/\D/g, "")),
            weightKg: num(r.player?.weight?.replace(/\D/g, "")),
            club: r.statistics?.[0]?.team?.name,
          }));
        if (!list.length) return null;
        return {
          players: list,
          paging: { current: 1, total: 1 },
          source: "api-football" as const,
        };
      },
      fallback,
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

/** Build a full FootCard profile for any world player id. */
export const getWorldPlayerCard = createServerFn({ method: "GET" })
  .inputValidator((input: { playerId: number; season?: number }) => input)
  .handler(async ({ data }): Promise<CachedResult<WorldPlayerCard | null>> => {
    const apiKey = apiFootballKey();
    if (!apiKey) return { data: null, fetchedAt: null };
    const season = data.season ?? currentSeason();

    return cachedMeta<WorldPlayerCard | null>(
      `player-card:${data.playerId}:${season}`,
      TTL.PLAYER,
      async () => {
        const json = await apiFootball<{
          response?: {
            player?: {
              id?: number;
              name?: string;
              age?: number;
              nationality?: string;
              height?: string;
              weight?: string;
              photo?: string;
              injured?: boolean;
            };
            statistics?: {
              team?: { name?: string };
              league?: { name?: string };
              games?: { position?: string; appearences?: number; rating?: string; minutes?: number };
              goals?: { total?: number; assists?: number };
              shots?: { total?: number; on?: number };
              passes?: { total?: number; key?: number; accuracy?: number };
              dribbles?: { attempts?: number; success?: number };
              tackles?: { total?: number; interceptions?: number; blocks?: number };
              duels?: { total?: number; won?: number };
              fouls?: { committed?: number };
            }[];
          }[];
        }>(`/players?id=${data.playerId}&season=${season}`, apiKey);

        let payload = json;
        for (const alt of seasonCandidates(season)) {
          if (payload?.response?.length) break;
          payload = await apiFootball<typeof json>(
            `/players?id=${data.playerId}&season=${alt}`,
            apiKey,
          );
        }

        const entry = payload?.response?.[0];
        const p = entry?.player;
        if (!p?.id) return null;
        const s = entry?.statistics?.[0];
        const apps = Math.max(1, s?.games?.appearences ?? 1);
        const minutes = Math.max(90, s?.games?.minutes ?? apps * 60);
        const per90 = (v?: number) => ((v ?? 0) / minutes) * 90;
        const rating = parseFloat(s?.games?.rating ?? "6.6");
        const base = clamp(40 + (Number.isFinite(rating) ? (rating - 5.5) * 24 : 22));
        const seed = String(p.id);
        const rawPos = (s?.games?.position ?? "").trim().toLowerCase();
        const pos = rawPos.startsWith("goal")
          ? "GK"
          : rawPos.startsWith("def")
            ? "CB"
            : rawPos.startsWith("mid")
              ? "CM"
              : rawPos.startsWith("att") || rawPos.startsWith("for")
                ? "ST"
                : "CM";

        const core = {
          pac: clamp(base + (pos === "CB" ? -2 : 4) + ((hash(seed + "pac") % 13) - 6)),
          sho: clamp(base + per90(s?.goals?.total) * 22 + per90(s?.shots?.total) * 4 - 6),
          pas: clamp(base + (s?.passes?.accuracy ?? 70) * 0.18 + per90(s?.passes?.key) * 6 - 12),
          dri: clamp(base + per90(s?.dribbles?.success) * 8 - 2),
          def: clamp(
            base +
              per90(s?.tackles?.total) * 8 +
              per90(s?.tackles?.interceptions) * 6 -
              (pos === "ST" ? 18 : 6),
          ),
          phy: clamp(
            base +
              ((s?.duels?.won ?? 0) / Math.max(1, s?.duels?.total ?? 1)) * 22 +
              (num(p.weight?.replace(/\D/g, "")) ?? 75) * 0.05 -
              12,
          ),
        };

        const overall = Math.round(
          (core.pac + core.sho + core.pas + core.dri + core.def + core.phy) / 6,
        );

        const card: PlayerCardData = {
          id: `api-${p.id}`,
          type: "player",
          name: p.name ?? "—",
          club: s?.team?.name ?? "Free Agent",
          clubBadge: "⚽",
          nation: p.nationality ?? "🌍",
          position: pos,
          tier: tierFor(overall),
          core,
          age: p.age ?? 0,
          heightCm: num(p.height?.replace(/\D/g, "")) ?? 180,
          weightKg: num(p.weight?.replace(/\D/g, "")) ?? 75,
          foot: hash(seed) % 4 === 0 ? "left" : "right",
          marketValue: "—",
          contractUntil: "—",
          injuries: p.injured ? "Injured" : null,
          technical: attrs(
            [
              "finishing", "shotPower", "longShots", "volleys", "penalties", "curve", "freeKick",
              "crossing", "shortPassing", "longPassing", "vision", "ballControl", "dribblingAttr", "heading",
            ],
            (core.sho + core.pas + core.dri) / 3,
            seed,
          ),
          physical: attrs(
            ["acceleration", "sprintSpeed", "agility", "balance", "stamina", "strength", "jumping", "reactions"],
            (core.pac + core.phy) / 2,
            seed,
          ),
          mental: attrs(
            [
              "positioning", "offTheBall", "composure", "aggression", "interceptions", "marking",
              "standingTackle", "slidingTackle", "defAwareness", "workRate", "leadership", "flair",
            ],
            (core.def + core.pas) / 2,
            seed,
          ),
          form: clamp(Number.isFinite(rating) ? rating * 10 : 66),
          careerGoals: s?.goals?.total ?? 0,
          photo: p.photo ?? `https://media.api-sports.io/football/players/${p.id}.png`,
          league: s?.league?.name ?? undefined,
        };

        return { card, source: "api-football" as const };
      },
      null,
    );
  });
