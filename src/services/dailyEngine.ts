/**
 * Autonomous daily puzzle engine.
 *
 * Every challenge is derived deterministically from the UTC date, so all users
 * worldwide get the identical puzzle set for a given day with zero manual
 * curation and no server round-trip.
 */
import { players, type PlayerCardData } from "@/data/football";
import { statKeys, transferPaths, type HLRound, type StatKey, type TransferPath } from "@/lib/games";

export function utcDateKey(date = new Date()): string {
  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, "0"),
    String(date.getUTCDate()).padStart(2, "0"),
  ].join("-");
}

/** FNV-1a — stable across runtimes, unlike hash functions built on Math.random. */
export function hashSeed(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Deterministic PRNG (mulberry32). */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pickFrom<T>(arr: readonly T[], rnd: () => number): T {
  return arr[Math.floor(rnd() * arr.length) % arr.length]!;
}

const tierWeight: Record<string, number> = { icon: 5, elite: 4, gold: 3, silver: 2, bronze: 1 };

/** Popularity score used to bias daily puzzles toward trending players. */
export function popularityScore(p: PlayerCardData): number {
  const core = (p.core.pac + p.core.sho + p.core.pas + p.core.dri + p.core.def + p.core.phy) / 6;
  return (tierWeight[p.tier] ?? 1) * 12 + p.form * 4 + core / 2 + Math.max(0, 26 - p.age);
}

/**
 * The live player database, ordered by trending/popularity so daily puzzles
 * automatically sample recognisable names as the database grows.
 */
export function trendingPlayers(limit = 12): PlayerCardData[] {
  return [...players].sort((a, b) => popularityScore(b) - popularityScore(a)).slice(0, limit);
}

/** Weighted sample: popular players appear more often, everyone stays possible. */
function pickWeighted(pool: readonly PlayerCardData[], rnd: () => number): PlayerCardData {
  const weights = pool.map(popularityScore);
  const total = weights.reduce((s, w) => s + w, 0);
  let cursor = rnd() * total;
  for (let i = 0; i < pool.length; i++) {
    cursor -= weights[i]!;
    if (cursor <= 0) return pool[i]!;
  }
  return pool[pool.length - 1]!;
}


export type DailyChallenge = {
  /** Stable id for the day, e.g. "2026-08-21". */
  id: string;
  seed: number;
  player: PlayerCardData;
  higherLower: HLRound[];
  transferPath: TransferPath;
  /** Milliseconds until the next UTC rollover. */
  msUntilNextChallenge: number;
};

export function dailyPlayerOfDay(date = new Date()): PlayerCardData {
  const rnd = seededRandom(hashSeed(`player:${utcDateKey(date)}`));
  return pickWeighted(trendingPlayers(), rnd);
}

export function dailyHigherLowerRounds(date = new Date(), count = 10): HLRound[] {
  const rnd = seededRandom(hashSeed(`hl:${utcDateKey(date)}`));
  const pool = trendingPlayers(Math.max(8, Math.floor(players.length * 0.8)));
  const rounds: HLRound[] = [];
  for (let i = 0; i < count; i++) {
    const a = pickWeighted(pool, rnd);
    const others = pool.filter((p) => p.id !== a.id);
    let b = pickWeighted(others, rnd);
    const stat: StatKey = pickFrom(statKeys, rnd);
    let guard = 0;
    while (b.core[stat] === a.core[stat] && guard++ < 20) b = pickWeighted(others, rnd);
    rounds.push({ a, b, stat });
  }
  return rounds;
}

export function dailyTransferPath(date = new Date()): TransferPath {
  const rnd = seededRandom(hashSeed(`tp:${utcDateKey(date)}`));
  const trendingIds = new Set(trendingPlayers().map((p) => p.id));
  const preferred = transferPaths.filter((p) => trendingIds.has(p.playerId));
  return pickFrom(preferred.length ? preferred : transferPaths, rnd);
}


export function msUntilNextUtcDay(now = new Date()): number {
  const next = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1);
  return next - now.getTime();
}

export function buildDailyChallenge(date = new Date()): DailyChallenge {
  return {
    id: utcDateKey(date),
    seed: hashSeed(utcDateKey(date)),
    player: dailyPlayerOfDay(date),
    higherLower: dailyHigherLowerRounds(date),
    transferPath: dailyTransferPath(date),
    msUntilNextChallenge: msUntilNextUtcDay(date),
  };
}
