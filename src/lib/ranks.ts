export type RankKey = "bronze" | "silver" | "gold" | "diamond" | "legend";

export type Rank = {
  key: RankKey;
  minXp: number;
  emoji: string;
  /** tailwind classes for the badge */
  badge: string;
};

export const ranks: Rank[] = [
  { key: "bronze", minXp: 0, emoji: "🥉", badge: "bg-[oklch(0.55_0.08_60)]/20 text-[oklch(0.78_0.09_60)]" },
  { key: "silver", minXp: 500, emoji: "🥈", badge: "bg-muted/40 text-muted-foreground" },
  { key: "gold", minXp: 1500, emoji: "🥇", badge: "bg-accent/20 text-accent" },
  { key: "diamond", minXp: 4000, emoji: "💎", badge: "bg-primary/20 text-primary" },
  { key: "legend", minXp: 10000, emoji: "👑", badge: "gradient-pitch text-background" },
];

export function rankFor(xp: number): Rank {
  let current = ranks[0]!;
  for (const r of ranks) if (xp >= r.minXp) current = r;
  return current;
}

export function nextRank(xp: number): Rank | null {
  return ranks.find((r) => r.minXp > xp) ?? null;
}

export function rankProgress(xp: number): number {
  const current = rankFor(xp);
  const next = nextRank(xp);
  if (!next) return 100;
  return Math.round(((xp - current.minXp) / (next.minXp - current.minXp)) * 100);
}
