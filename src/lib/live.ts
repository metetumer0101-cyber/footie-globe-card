import { players, teams } from "@/data/football";
import { hashSeed, seededRandom, utcDateKey } from "@/services/dailyEngine";

export type LivePlayerLine = {
  playerId: string | null;
  name: string;
  team: string;
  rating: number;
  goals: number;
  assists: number;
};

export type LiveFixture = {
  id: string;
  league: string;
  home: { name: string; badge: string; score: number };
  away: { name: string; badge: string; score: number };
  status: "scheduled" | "live" | "halftime" | "finished";
  /** Match minute for live games, kickoff HH:mm (UTC) for scheduled ones. */
  minute: number;
  kickoff: string;
  performers: LivePlayerLine[];
};

export type LiveFeed = {
  date: string;
  source: "api-football" | "mock";
  fixtures: LiveFixture[];
};

/** Deterministic offline feed so the module works with no API key configured. */
export function buildMockFeed(now = new Date()): LiveFeed {
  const date = utcDateKey(now);
  const rnd = seededRandom(hashSeed(`live:${date}`));
  const pool = [...teams];
  const fixtures: LiveFixture[] = [];
  const minutesNow = now.getUTCHours() * 60 + now.getUTCMinutes();

  for (let i = 0; i < Math.min(5, Math.floor(pool.length / 2)); i++) {
    const home = pool.splice(Math.floor(rnd() * pool.length), 1)[0];
    const away = pool.splice(Math.floor(rnd() * pool.length), 1)[0];
    if (!home || !away) break;

    const kickoffMinutes = 12 * 60 + i * 105;
    const elapsed = minutesNow - kickoffMinutes;
    const status: LiveFixture["status"] =
      elapsed < 0 ? "scheduled" : elapsed > 100 ? "finished" : elapsed >= 45 && elapsed < 50 ? "halftime" : "live";
    const minute = status === "scheduled" ? 0 : Math.min(90, Math.max(1, elapsed));

    const homeScore = status === "scheduled" ? 0 : Math.floor(rnd() * 4);
    const awayScore = status === "scheduled" ? 0 : Math.floor(rnd() * 3);

    const performers: LivePlayerLine[] = [home, away].flatMap((team) => {
      const squad = players.filter((p) => p.club === team.club);
      const picks = (squad.length ? squad : [players[Math.floor(rnd() * players.length)]!]).slice(0, 2);
      return picks.map((p) => ({
        playerId: p.id,
        name: p.name,
        team: team.name,
        rating: Math.round((6 + rnd() * 3.5) * 10) / 10,
        goals: status === "scheduled" ? 0 : rnd() > 0.72 ? 1 : 0,
        assists: status === "scheduled" ? 0 : rnd() > 0.82 ? 1 : 0,
      }));
    });

    fixtures.push({
      id: `${date}-${home.id}-${away.id}`,
      league: home.league,
      home: { name: home.name, badge: home.clubBadge, score: homeScore },
      away: { name: away.name, badge: away.clubBadge, score: awayScore },
      status,
      minute,
      kickoff: `${String(Math.floor(kickoffMinutes / 60) % 24).padStart(2, "0")}:${String(kickoffMinutes % 60).padStart(2, "0")}`,
      performers,
    });
  }

  return { date, source: "mock", fixtures };
}
