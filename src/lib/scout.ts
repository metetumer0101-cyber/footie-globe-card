import { players, type PlayerCardData } from "@/data/football";

export const clubLeagues: Record<string, string> = {
  "Real Madrid": "La Liga",
  Barcelona: "La Liga",
  "Manchester City": "Premier League",
  Liverpool: "Premier League",
  Arsenal: "Premier League",
  "Bayern München": "Bundesliga",
  "Paris Saint-Germain": "Ligue 1",
  Inter: "Serie A",
  Galatasaray: "Süper Lig",
};

export const nationNames: Record<string, string> = {
  "🇫🇷": "France",
  "🇳🇴": "Norway",
  "🏴󠁧󠁢󠁥󠁮󠁧󠁿": "England",
  "🇹🇷": "Türkiye",
  "🇪🇸": "Spain",
  "🇧🇷": "Brazil",
  "🇩🇪": "Germany",
  "🇲🇦": "Morocco",
  "🇳🇱": "Netherlands",
  "🇮🇹": "Italy",
  "🇬🇪": "Georgia",
};

export type ScoutPlayer = PlayerCardData & {
  league: string;
  nationName: string;
  valueM: number;
  contractYear: number;
  potential: number;
  scoutRating: number;
};

const parseValueM = (v: string) => {
  const n = parseFloat(v.replace(/[^\d.]/g, "")) || 0;
  return /K/i.test(v) ? n / 1000 : n;
};

const avgCore = (p: PlayerCardData) => {
  const c = p.core;
  const vals =
    p.position === "GK"
      ? [c.phy, c.def, c.pas, c.dri]
      : p.position === "CB" || p.position.endsWith("B")
        ? [c.pac, c.def, c.phy, c.pas]
        : [c.pac, c.sho, c.pas, c.dri, c.phy];
  return vals.reduce((a, b) => a + b, 0) / vals.length;
};

export const scoutPlayers: ScoutPlayer[] = players.map((p) => {
  const base = avgCore(p);
  const growth = Math.max(0, 24 - p.age) * 0.8;
  const potential = Math.min(99, Math.round(base + growth));
  return {
    ...p,
    league: clubLeagues[p.club] ?? "Other",
    nationName: nationNames[p.nation] ?? p.nation,
    valueM: parseValueM(p.marketValue),
    contractYear: parseInt(p.contractUntil, 10) || 0,
    potential,
    scoutRating: Math.round(base * 0.6 + potential * 0.25 + p.form * 0.15),
  };
});

export const leagues = Array.from(new Set(scoutPlayers.map((p) => p.league))).sort();
export const nations = Array.from(new Set(scoutPlayers.map((p) => p.nationName))).sort();
export const positionsList = Array.from(new Set(scoutPlayers.map((p) => p.position))).sort();

export const AGE_BOUNDS: [number, number] = [16, 40];
export const VALUE_BOUNDS: [number, number] = [
  0,
  Math.ceil(Math.max(...scoutPlayers.map((p) => p.valueM)) / 10) * 10,
];

export type StatKey = "pac" | "sho" | "pas" | "dri" | "def" | "phy";

export type ScoutFilterState = {
  query: string;
  positions: string[];
  age: [number, number];
  value: [number, number];
  foot: "all" | "left" | "right" | "both";
  contractBefore: number | "all";
  minStats: Record<StatKey, number>;
  league: string;
  nation: string;
};

export const emptyStats: Record<StatKey, number> = {
  pac: 0,
  sho: 0,
  pas: 0,
  dri: 0,
  def: 0,
  phy: 0,
};

export const defaultFilters: ScoutFilterState = {
  query: "",
  positions: [],
  age: AGE_BOUNDS,
  value: VALUE_BOUNDS,
  foot: "all",
  contractBefore: "all",
  minStats: { ...emptyStats },
  league: "all",
  nation: "all",
};

export type PresetKey = "wonderkids" | "expiring" | "pace" | "playmakers";

export const applyPreset = (key: PresetKey): ScoutFilterState => {
  const f: ScoutFilterState = { ...defaultFilters, minStats: { ...emptyStats } };
  if (key === "wonderkids") return { ...f, age: [16, 21] };
  if (key === "expiring") return { ...f, contractBefore: 2027 };
  if (key === "pace") return { ...f, minStats: { ...emptyStats, pac: 90 } };
  return { ...f, minStats: { ...emptyStats, pas: 85, dri: 85 } };
};

export type SortKey = "scoutRating" | "valueM" | "age" | "potential" | "form" | StatKey;

export const filterAndSort = (
  f: ScoutFilterState,
  sort: SortKey,
  dir: "asc" | "desc",
): ScoutPlayer[] => {
  const q = f.query.trim().toLowerCase();
  const out = scoutPlayers.filter((p) => {
    if (q && !p.name.toLowerCase().includes(q) && !p.club.toLowerCase().includes(q)) return false;
    if (f.positions.length && !f.positions.includes(p.position)) return false;
    if (p.age < f.age[0] || p.age > f.age[1]) return false;
    if (p.valueM < f.value[0] || p.valueM > f.value[1]) return false;
    if (f.foot !== "all" && p.foot !== f.foot) return false;
    if (f.contractBefore !== "all" && p.contractYear > f.contractBefore) return false;
    if (f.league !== "all" && p.league !== f.league) return false;
    if (f.nation !== "all" && p.nationName !== f.nation) return false;
    for (const k of Object.keys(f.minStats) as StatKey[]) {
      if (p.core[k] < f.minStats[k]) return false;
    }
    return true;
  });

  const get = (p: ScoutPlayer): number =>
    sort === "scoutRating" || sort === "valueM" || sort === "age" || sort === "potential" || sort === "form"
      ? (p[sort] as number)
      : p.core[sort];

  return out.sort((a, b) => (dir === "asc" ? get(a) - get(b) : get(b) - get(a)));
};
