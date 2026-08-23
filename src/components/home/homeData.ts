import { players, teams } from "@/data/football";
import type { PlayerCardData } from "@/data/football";
import type { LiveFixture } from "@/lib/live";

/**
 * Derived helpers backing the 4 home-page rules. All run from local/curated
 * data so the page renders regardless of the live API / database state.
 */

// Known club -> league map for the curated player roster (covers clubs not in
// the `teams` list). Lowercase keys.
const CLUB_LEAGUE: Record<string, string> = {
  "real madrid": "La Liga",
  barcelona: "La Liga",
  "manchester city": "Premier League",
  arsenal: "Premier League",
  liverpool: "Premier League",
  "manchester united": "Premier League",
  chelsea: "Premier League",
  tottenham: "Premier League",
  "bayern münchen": "Bundesliga",
  "borussia dortmund": "Bundesliga",
  inter: "Serie A",
  "ac milan": "Serie A",
  juventus: "Serie A",
  roma: "Serie A",
  lazio: "Serie A",
  napoli: "Serie A",
  galatasaray: "Süper Lig",
  "fenerbahçe": "Süper Lig",
  "fenerbahce": "Süper Lig",
  "beşiktaş": "Süper Lig",
  "besiktas": "Süper Lig",
  "paris saint-germain": "Ligue 1",
  marseille: "Ligue 1",
  monaco: "Ligue 1",
  lyon: "Ligue 1",
};

export function leagueOfTeam(teamName: string): string {
  const known = teams.find((t) => t.name.toLowerCase() === teamName.toLowerCase());
  if (known) return known.league;
  return CLUB_LEAGUE[teamName.toLowerCase()] ?? "Other";
}

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

/* ---------------- Rule 3: weekly best players (one per league) ---------------- */

export type LeagueBest = { league: string; player: PlayerCardData };

export function weeklyBestByLeague(): LeagueBest[] {
  const byLeague = new Map<string, PlayerCardData>();
  for (const p of players) {
    const lg = leagueOfTeam(p.club);
    const cur = byLeague.get(lg);
    if (!cur || p.form > cur.form) byLeague.set(lg, p);
  }
  return [...byLeague.entries()].map(([league, player]) => ({ league, player }));
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

export function favoriteTeamName(teamIds: string[]): string | undefined {
  for (const id of teamIds) {
    const t = teams.find((x) => x.id === id);
    if (t) return t.name;
  }
  return teamIds.length ? teamIds[0] : undefined;
}

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
