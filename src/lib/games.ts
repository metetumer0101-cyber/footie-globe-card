import { players, type PlayerCardData } from "@/data/football";

export type GameKey = "higher_lower" | "transfer_path" | "daily_player" | "weekly_xi";

export type StatKey = "pac" | "sho" | "pas" | "dri" | "def" | "phy";
export const statKeys: StatKey[] = ["pac", "sho", "pas", "dri", "def", "phy"];

/* ---------------- Higher or Lower ---------------- */

export type HLRound = { a: PlayerCardData; b: PlayerCardData; stat: StatKey };

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

export function newHLRound(exclude?: string): HLRound {
  const pool = players.filter((p) => p.id !== exclude);
  const a = pick(pool);
  let b = pick(pool.filter((p) => p.id !== a.id));
  const stat = pick(statKeys);
  let guard = 0;
  while (b.core[stat] === a.core[stat] && guard++ < 20) {
    b = pick(pool.filter((p) => p.id !== a.id));
  }
  return { a, b, stat };
}

/** X1 → X2 (3+ streak) → X3 (6+ streak) */
export function streakMultiplier(streak: number): 1 | 2 | 3 {
  if (streak >= 6) return 3;
  if (streak >= 3) return 2;
  return 1;
}

export const HL_BASE_XP = 20;
export const HL_PENALTY = -15;

/* ---------------- Transfer Path ---------------- */

export type TransferPath = { playerId: string; clubs: string[] };

export const transferPaths: TransferPath[] = [
  { playerId: "mbappe", clubs: ["AS Monaco", "Paris Saint-Germain", "Real Madrid"] },
  { playerId: "haaland", clubs: ["Molde", "RB Salzburg", "Borussia Dortmund", "Manchester City"] },
  { playerId: "bellingham", clubs: ["Birmingham City", "Borussia Dortmund", "Real Madrid"] },
  { playerId: "arda", clubs: ["Fenerbahçe", "Real Madrid"] },
  { playerId: "yamal", clubs: ["Barcelona B", "Barcelona"] },
  { playerId: "vinicius", clubs: ["Flamengo", "Real Madrid"] },
  { playerId: "wirtz", clubs: ["Köln", "Bayer Leverkusen", "Liverpool"] },
  { playerId: "kvaratskhelia", clubs: ["Dinamo Batumi", "Rubin Kazan", "Dinamo Batumi", "Napoli", "Paris Saint-Germain"] },
  { playerId: "hakimi", clubs: ["Real Madrid", "Borussia Dortmund", "Inter", "Paris Saint-Germain"] },
  { playerId: "vandijk", clubs: ["Groningen", "Celtic", "Southampton", "Liverpool"] },
  { playerId: "donnarumma", clubs: ["Milan", "Paris Saint-Germain", "Manchester City"] },
  { playerId: "musiala", clubs: ["Chelsea Academy", "Bayern München"] },
  { playerId: "saka", clubs: ["Arsenal Academy", "Arsenal"] },
  { playerId: "endrick", clubs: ["Palmeiras", "Real Madrid"] },
];

export const TP_BASE_XP = 120;
export const TP_HINT_COST = 30;
export const TP_PENALTY = -25;

export function transferPathXp(hintsUsed: number): number {
  return Math.max(20, TP_BASE_XP - hintsUsed * TP_HINT_COST);
}

export function randomTransferPath(exclude?: string): TransferPath {
  const pool = transferPaths.filter((p) => p.playerId !== exclude);
  return pick(pool);
}

/* ---------------- Daily Player (wordle-style) ---------------- */

export const DAILY_MAX_GUESSES = 6;
export const DAILY_BASE_XP = 180;
export const DAILY_GUESS_COST = 25;
export const DAILY_PENALTY = -10;

export function dailyPlayer(date = new Date()): PlayerCardData {
  const key = Number(
    `${date.getUTCFullYear()}${String(date.getUTCMonth() + 1).padStart(2, "0")}${String(date.getUTCDate()).padStart(2, "0")}`,
  );
  return players[key % players.length]!;
}

export function dailyXp(guessesUsed: number): number {
  return Math.max(30, DAILY_BASE_XP - (guessesUsed - 1) * DAILY_GUESS_COST);
}

/* ---------------- Weekly XI (pick the top performers) ---------------- */

export const WXI_PICK_COUNT = 5;
export const WXI_BASE_XP = 20;
export const WXI_MAX_BONUS = 100;

/**
 * XP for the Weekly XI game. Scored by the total real goals of the five
 * players the user picked, relative to the ideal five (highest scorers).
 * base is always granted for participation; the bonus scales with how good
 * the pick was.
 */
export function weeklyXiXp(score: number, ideal: number): number {
  const ratio = ideal > 0 ? Math.min(1, score / ideal) : 0;
  return Math.round(WXI_BASE_XP + ratio * WXI_MAX_BONUS);
}

export type Clue = "hit" | "close" | "miss";
export type DailyFeedback = {
  guess: PlayerCardData;
  nation: Clue;
  club: Clue;
  position: Clue;
  age: Clue;
  ageHint: "up" | "down" | "same";
};

const positionGroup = (pos: string): string => {
  if (pos === "GK") return "GK";
  if (["CB", "LB", "RB", "LWB", "RWB"].includes(pos)) return "DEF";
  if (["CDM", "CM", "CAM"].includes(pos)) return "MID";
  return "ATT";
};

export function compareDaily(guess: PlayerCardData, target: PlayerCardData): DailyFeedback {
  const ageDiff = target.age - guess.age;
  return {
    guess,
    nation: guess.nation === target.nation ? "hit" : "miss",
    club: guess.club === target.club ? "hit" : "miss",
    position:
      guess.position === target.position
        ? "hit"
        : positionGroup(guess.position) === positionGroup(target.position)
          ? "close"
          : "miss",
    age: ageDiff === 0 ? "hit" : Math.abs(ageDiff) <= 2 ? "close" : "miss",
    ageHint: ageDiff === 0 ? "same" : ageDiff > 0 ? "up" : "down",
  };
}

export const clueClass: Record<Clue, string> = {
  hit: "bg-primary/25 text-primary border-primary/40",
  close: "bg-accent/20 text-accent border-accent/40",
  miss: "bg-secondary/60 text-muted-foreground border-border",
};
