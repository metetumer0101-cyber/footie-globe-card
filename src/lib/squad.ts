import { managers, players, type ManagerCardData, type PlayerCardData } from "@/data/football";
import { clubLeagues } from "@/lib/scout";

export type FormationKey = "4-3-3" | "4-2-3-1" | "4-4-2" | "3-5-2" | "5-3-2";

export type PitchNode = { id: string; role: string; x: number; y: number };

export const formations: Record<FormationKey, PitchNode[]> = {
  "4-3-3": [
    { id: "gk", role: "GK", x: 50, y: 92 },
    { id: "lb", role: "LB", x: 14, y: 74 },
    { id: "lcb", role: "CB", x: 37, y: 78 },
    { id: "rcb", role: "CB", x: 63, y: 78 },
    { id: "rb", role: "RB", x: 86, y: 74 },
    { id: "cdm", role: "CDM", x: 50, y: 58 },
    { id: "lcm", role: "CM", x: 28, y: 48 },
    { id: "rcm", role: "CM", x: 72, y: 48 },
    { id: "lw", role: "LW", x: 18, y: 24 },
    { id: "st", role: "ST", x: 50, y: 16 },
    { id: "rw", role: "RW", x: 82, y: 24 },
  ],
  "4-2-3-1": [
    { id: "gk", role: "GK", x: 50, y: 92 },
    { id: "lb", role: "LB", x: 14, y: 74 },
    { id: "lcb", role: "CB", x: 37, y: 78 },
    { id: "rcb", role: "CB", x: 63, y: 78 },
    { id: "rb", role: "RB", x: 86, y: 74 },
    { id: "ldm", role: "CDM", x: 35, y: 60 },
    { id: "rdm", role: "CDM", x: 65, y: 60 },
    { id: "lam", role: "LW", x: 17, y: 40 },
    { id: "cam", role: "CAM", x: 50, y: 40 },
    { id: "ram", role: "RW", x: 83, y: 40 },
    { id: "st", role: "ST", x: 50, y: 16 },
  ],
  "4-4-2": [
    { id: "gk", role: "GK", x: 50, y: 92 },
    { id: "lb", role: "LB", x: 14, y: 74 },
    { id: "lcb", role: "CB", x: 37, y: 78 },
    { id: "rcb", role: "CB", x: 63, y: 78 },
    { id: "rb", role: "RB", x: 86, y: 74 },
    { id: "lm", role: "LW", x: 15, y: 50 },
    { id: "lcm", role: "CM", x: 38, y: 54 },
    { id: "rcm", role: "CM", x: 62, y: 54 },
    { id: "rm", role: "RW", x: 85, y: 50 },
    { id: "lst", role: "ST", x: 37, y: 18 },
    { id: "rst", role: "ST", x: 63, y: 18 },
  ],
  "3-5-2": [
    { id: "gk", role: "GK", x: 50, y: 92 },
    { id: "lcb", role: "CB", x: 25, y: 78 },
    { id: "cb", role: "CB", x: 50, y: 80 },
    { id: "rcb", role: "CB", x: 75, y: 78 },
    { id: "lwb", role: "LB", x: 10, y: 55 },
    { id: "rwb", role: "RB", x: 90, y: 55 },
    { id: "cdm", role: "CDM", x: 50, y: 62 },
    { id: "lcm", role: "CM", x: 32, y: 46 },
    { id: "rcm", role: "CM", x: 68, y: 46 },
    { id: "lst", role: "ST", x: 37, y: 18 },
    { id: "rst", role: "ST", x: 63, y: 18 },
  ],
  "5-3-2": [
    { id: "gk", role: "GK", x: 50, y: 92 },
    { id: "lwb", role: "LB", x: 10, y: 68 },
    { id: "lcb", role: "CB", x: 30, y: 80 },
    { id: "cb", role: "CB", x: 50, y: 82 },
    { id: "rcb", role: "CB", x: 70, y: 80 },
    { id: "rwb", role: "RB", x: 90, y: 68 },
    { id: "lcm", role: "CM", x: 28, y: 50 },
    { id: "cm", role: "CDM", x: 50, y: 56 },
    { id: "rcm", role: "CM", x: 72, y: 50 },
    { id: "lst", role: "ST", x: 37, y: 20 },
    { id: "rst", role: "ST", x: 63, y: 20 },
  ],
};

export const formationKeys = Object.keys(formations) as FormationKey[];

const groups: Record<string, string[]> = {
  GK: ["GK"],
  CB: ["CB"],
  LB: ["LB", "RB", "LWB", "RWB"],
  RB: ["RB", "LB", "LWB", "RWB"],
  CDM: ["CDM", "CM"],
  CM: ["CM", "CDM", "CAM"],
  CAM: ["CAM", "CM", "RW", "LW"],
  LW: ["LW", "RW", "ST", "CAM"],
  RW: ["RW", "LW", "ST", "CAM"],
  ST: ["ST", "LW", "RW", "CF"],
};

/** 2 = perfect, 1 = related, 0 = out of position */
export const roleFit = (role: string, position: string): 0 | 1 | 2 => {
  if (role === position) return 2;
  const list = groups[role] ?? [];
  if (!list.length) return 0;
  if (position === "GK" || role === "GK") return 0;
  return list.includes(position) ? 1 : 0;
};

export const leagueOf = (club: string) => clubLeagues[club] ?? "Other";

export type SquadState = {
  name: string;
  formation: FormationKey;
  starters: Record<string, string | null>;
  bench: (string | null)[];
  managerId: string | null;
};

export const BENCH_SLOTS = 7;

export const emptySquad = (formation: FormationKey = "4-3-3"): SquadState => ({
  name: "",
  formation,
  starters: Object.fromEntries(formations[formation].map((n) => [n.id, null])),
  bench: Array.from({ length: BENCH_SLOTS }, () => null),
  managerId: null,
});

export const playerById = (id: string | null): PlayerCardData | null =>
  (id && players.find((p) => p.id === id)) || null;

export const managerById = (id: string | null): ManagerCardData | null =>
  (id && managers.find((m) => m.id === id)) || null;

export type Chemistry = {
  total: number;
  perPlayer: Record<string, number>;
  filled: number;
};

/** Chemistry: role fit + club/league/nation links with pitch neighbours + manager bonuses. */
export const computeChemistry = (squad: SquadState): Chemistry => {
  const nodes = formations[squad.formation];
  const manager = managerById(squad.managerId);
  const perPlayer: Record<string, number> = {};
  let sum = 0;
  let filled = 0;

  const entries = nodes
    .map((n) => ({ node: n, player: playerById(squad.starters[n.id] ?? null) }))
    .filter((e): e is { node: PitchNode; player: PlayerCardData } => e.player !== null);

  for (const { node, player } of entries) {
    filled += 1;
    const fit = roleFit(node.role, player.position);
    let score = fit === 2 ? 55 : fit === 1 ? 35 : 10;

    const neighbours = entries
      .filter((e) => e.player.id !== player.id)
      .map((e) => ({ ...e, d: Math.hypot(e.node.x - node.x, e.node.y - node.y) }))
      .sort((a, b) => a.d - b.d)
      .slice(0, 3);

    for (const n of neighbours) {
      if (n.player.club === player.club) score += 9;
      else if (leagueOf(n.player.club) === leagueOf(player.club)) score += 4;
      if (n.player.nation === player.nation) score += 5;
    }

    if (manager) {
      if (manager.club === player.club) score += 8;
      else if (leagueOf(manager.club) === leagueOf(player.club)) score += 3;
      if (manager.nation === player.nation) score += 4;
      if (manager.formation === squad.formation) score += 4;
    }

    const capped = Math.max(0, Math.min(100, Math.round(score)));
    perPlayer[player.id] = capped;
    sum += capped;
  }

  return {
    total: filled ? Math.round(sum / nodes.length) : 0,
    perPlayer,
    filled,
  };
};

export type SquadRatings = { att: number; mid: number; def: number; avgAge: number; valueM: number };

const parseValueM = (v: string) => {
  const n = parseFloat(v.replace(/[^\d.]/g, "")) || 0;
  return /K/i.test(v) ? n / 1000 : n;
};

export const computeRatings = (squad: SquadState): SquadRatings => {
  const nodes = formations[squad.formation];
  const rows = nodes
    .map((n) => ({ role: n.role, player: playerById(squad.starters[n.id] ?? null) }))
    .filter((r): r is { role: string; player: PlayerCardData } => r.player !== null);

  const avg = (list: PlayerCardData[], pick: (p: PlayerCardData) => number) =>
    list.length ? Math.round(list.reduce((a, p) => a + pick(p), 0) / list.length) : 0;

  const attackers = rows.filter((r) => ["ST", "LW", "RW", "CAM"].includes(r.role)).map((r) => r.player);
  const mids = rows.filter((r) => ["CM", "CDM", "CAM"].includes(r.role)).map((r) => r.player);
  const defs = rows.filter((r) => ["CB", "LB", "RB", "GK"].includes(r.role)).map((r) => r.player);
  const all = rows.map((r) => r.player);

  return {
    att: avg(attackers, (p) => (p.core.sho + p.core.dri + p.core.pac) / 3),
    mid: avg(mids, (p) => (p.core.pas + p.core.dri + p.core.phy) / 3),
    def: avg(defs, (p) => (p.core.def + p.core.phy + p.core.pac) / 3),
    avgAge: avg(all, (p) => p.age),
    valueM: Math.round(all.reduce((a, p) => a + parseValueM(p.marketValue), 0)),
  };
};

const STORAGE_KEY = "footcard.squads";

export type SavedSquad = SquadState & { id: string; savedAt: number };

export const loadSquads = (): SavedSquad[] => {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as SavedSquad[]) : [];
  } catch {
    return [];
  }
};

export const persistSquads = (list: SavedSquad[]) => {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    /* ignore quota errors */
  }
};
