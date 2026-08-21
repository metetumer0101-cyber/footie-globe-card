import { Crown, Radar, Rocket, Shield, Sparkles, Swords, Timer, Trophy, type LucideIcon } from "lucide-react";

export type BadgeKey =
  | "first_xp"
  | "wonderkid_hunter"
  | "master_tactician"
  | "streak_master"
  | "path_finder"
  | "daily_solver"
  | "live_tracker"
  | "legend_scout";

export type BadgeStats = {
  xp: number;
  gamesPlayed: number;
  higherLowerWins: number;
  transferPathWins: number;
  dailyWins: number;
  liveMatchesViewed: number;
  squadsSaved: number;
};

export type BadgeDef = {
  key: BadgeKey;
  icon: LucideIcon;
  title: string;
  hint: string;
  /** 0..1 completion. */
  progress: (s: BadgeStats) => number;
};

const ratio = (value: number, target: number) => Math.max(0, Math.min(1, value / target));

export const badges: BadgeDef[] = [
  { key: "first_xp", icon: Sparkles, title: "First Points", hint: "Earn your first 50 XP", progress: (s) => ratio(s.xp, 50) },
  { key: "streak_master", icon: Rocket, title: "Streak Master", hint: "Win 10 Higher or Lower rounds", progress: (s) => ratio(s.higherLowerWins, 10) },
  { key: "path_finder", icon: Radar, title: "Wonderkid Hunter", hint: "Solve 5 Transfer Path puzzles", progress: (s) => ratio(s.transferPathWins, 5) },
  { key: "daily_solver", icon: Timer, title: "Daily Solver", hint: "Crack 3 daily player puzzles", progress: (s) => ratio(s.dailyWins, 3) },
  { key: "master_tactician", icon: Swords, title: "Master Tactician", hint: "Save 3 squads in Squad Builder", progress: (s) => ratio(s.squadsSaved, 3) },
  { key: "live_tracker", icon: Shield, title: "Live Match Tracker", hint: "Follow 5 live fixtures", progress: (s) => ratio(s.liveMatchesViewed, 5) },
  { key: "wonderkid_hunter", icon: Trophy, title: "Gold Scout", hint: "Reach 2,500 XP", progress: (s) => ratio(s.xp, 2500) },
  { key: "legend_scout", icon: Crown, title: "Legend Scout", hint: "Reach 10,000 XP", progress: (s) => ratio(s.xp, 10000) },
];

export const emptyBadgeStats: BadgeStats = {
  xp: 0,
  gamesPlayed: 0,
  higherLowerWins: 0,
  transferPathWins: 0,
  dailyWins: 0,
  liveMatchesViewed: 0,
  squadsSaved: 0,
};

const LOCAL_KEY = "footcard:badge-stats";

export function readLocalBadgeStats(): BadgeStats {
  if (typeof window === "undefined") return emptyBadgeStats;
  try {
    const raw = window.localStorage.getItem(LOCAL_KEY);
    return raw ? { ...emptyBadgeStats, ...(JSON.parse(raw) as Partial<BadgeStats>) } : emptyBadgeStats;
  } catch {
    return emptyBadgeStats;
  }
}

export function bumpBadgeStat(key: keyof BadgeStats, amount = 1): BadgeStats {
  const next = { ...readLocalBadgeStats() };
  next[key] = (next[key] ?? 0) + amount;
  if (typeof window !== "undefined") window.localStorage.setItem(LOCAL_KEY, JSON.stringify(next));
  return next;
}

export function isUnlocked(def: BadgeDef, stats: BadgeStats): boolean {
  return def.progress(stats) >= 1;
}
