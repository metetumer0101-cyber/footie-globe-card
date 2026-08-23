import type { LiveFixture } from "@/lib/live";

/**
 * Pure helpers backing the home-page rules (2 & 4). No demo/curated player or
 * team lists live here any more — Rule 3 (weekly best) and Rule 1 (team search)
 * read from the live API / Supabase via their server functions.
 */

/** Basic accent/case-insensitive normalization for name matching. */
function norm(s: string): string {
  return s
    .toLowerCase()
    .replace(/ş/g, "s")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ö/g, "o")
    .replace(/ı/g, "i")
    .replace(/ç/g, "c")
    .replace(/[^a-z0-9 ]/g, "")
    .trim();
}

/* ---------------- Rule 4: key matches & derbies ---------------- */

const DERBY_PAIRS: [string, string][] = [
  ["galatasaray", "fenerbahce"],
  ["real madrid", "barcelona"],
  ["manchester city", "manchester united"],
  ["inter", "ac milan"],
  ["bayern", "borussia dortmund"],
  ["liverpool", "everton"],
  ["arsenal", "tottenham"],
  ["paris saint-germain", "marseille"],
  ["juventus", "inter"],
  ["roma", "lazio"],
];

// Big clubs used to surface a fixture as "featured" even when it isn't a classic derby.
const BIG_CLUBS = [
  "real madrid", "barcelona", "manchester city", "manchester united", "liverpool",
  "arsenal", "bayern", "inter", "ac milan", "paris saint-germain", "galatasaray",
  "fenerbahce", "juventus", "chelsea", "tottenham", "dortmund",
];

export function isDerbyMatth(home: string, away: string): boolean {
  const a = norm(home);
  const b = norm(away);
  return DERBY_PAIRS.some(([x, y]) => (a === x && b === y) || (a === y && b === x));
}

export function isFeaturedMatch(home: string, away: string): boolean {
  const a = norm(home);
  const b = norm(away);
  return (
    (BIG_CLUBS.includes(a) && BIG_CLUBS.includes(b)) ||
    BIG_CLUBS.includes(a) ||
    BIG_CLUBS.includes(b)
  );
}

/* ---------------- Rule 2: favorite team next + previous ---------------- */

export function teamNextPrev(
  fixtures: LiveFixture[],
  teamName: string | undefined,
): { next?: LiveFixture; prev?: LiveFixture } {
  if (!teamName) return {};
  const matches = fixtures.filter((f) => {
    const a = norm(f.home.name);
    const b = norm(f.away.name);
    const t = norm(teamName);
    return a === t || b === t;
  });
  let next: LiveFixture | undefined;
  let prev: LiveFixture | undefined;
  for (const f of matches) {
    if (f.status === "live" || f.status === "halftime") {
      next = next ?? f;
    } else if (f.status === "scheduled") {
      if (!next || f.kickoff < next.kickoff) next = f;
    } else if (f.status === "finished") {
      if (!prev || f.kickoff > prev.kickoff) prev = f;
    }
  }
  return { next, prev };
}
