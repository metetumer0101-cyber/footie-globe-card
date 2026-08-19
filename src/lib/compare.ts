import {
  players,
  managers,
  teams,
  type ManagerCardData,
  type PlayerCardData,
  type TeamCardData,
} from "@/data/football";

export type EntityKind = "player" | "manager" | "team";
export type Entity = PlayerCardData | ManagerCardData | TeamCardData;

export const pools: Record<EntityKind, Entity[]> = {
  player: players,
  manager: managers,
  team: teams,
};

const avg = (list: { value: number }[]) =>
  Math.round(list.reduce((sum, a) => sum + a.value, 0) / Math.max(list.length, 1));

export type RadarPoint = { key: string; value: number };
export type Metric = { key: string; a: number; b: number; display?: (v: number) => string };

export function radarOf(entity: Entity): RadarPoint[] {
  if (entity.type === "player") {
    return (["pac", "sho", "pas", "dri", "def", "phy"] as const).map((key) => ({
      key,
      value: entity.core[key],
    }));
  }
  if (entity.type === "manager") {
    return (["att", "tdef", "pos", "prs", "dev", "mgt"] as const).map((key) => ({
      key,
      value: key === "tdef" ? entity.coach.def : entity.coach[key as "att"],
    }));
  }
  return (["att", "mid", "tdef", "pos", "prs", "frm"] as const).map((key) => ({
    key,
    value: entity.stats[key],
  }));
}

const num = (v: number) => `${v}`;
const pct = (v: number) => `${v}%`;

export function metricsOf(a: Entity, b: Entity): Metric[] {
  if (a.type === "player" && b.type === "player") {
    return [
      { key: "technicalAvg", a: avg(a.technical), b: avg(b.technical) },
      { key: "physicalAvg", a: avg(a.physical), b: avg(b.physical) },
      { key: "mentalAvg", a: avg(a.mental), b: avg(b.mental) },
      { key: "form", a: a.form, b: b.form },
      { key: "careerGoals", a: a.careerGoals, b: b.careerGoals, display: num },
    ];
  }
  if (a.type === "manager" && b.type === "manager") {
    return [
      { key: "winRate", a: a.winRate, b: b.winRate, display: pct },
      { key: "form", a: a.form, b: b.form },
      { key: "trophies", a: a.trophies, b: b.trophies, display: num },
      { key: "matches", a: a.matches, b: b.matches, display: num },
    ];
  }
  const ta = a as TeamCardData;
  const tb = b as TeamCardData;
  return [
    { key: "winRate", a: ta.winRate, b: tb.winRate, display: pct },
    { key: "goalsFor", a: ta.goalsFor, b: tb.goalsFor, display: num },
    { key: "trophies", a: ta.trophies, b: tb.trophies, display: num },
    { key: "form", a: ta.stats.frm, b: tb.stats.frm },
  ];
}

export function subtitleOf(entity: Entity): string {
  if (entity.type === "player") return `${entity.clubBadge} ${entity.club} · ${entity.position}`;
  if (entity.type === "manager") return `${entity.clubBadge} ${entity.club} · ${entity.formation}`;
  return `${entity.clubBadge} ${entity.league}`;
}

export const trendingMatchups: { kind: EntityKind; a: string; b: string }[] = [
  { kind: "player", a: "haaland", b: "mbappe" },
  { kind: "player", a: "arda", b: "yamal" },
  { kind: "manager", a: "pep", b: "ancelotti" },
  { kind: "team", a: "real-madrid", b: "man-city" },
];

export function findEntity(kind: EntityKind, id: string): Entity {
  return pools[kind].find((e) => e.id === id) ?? pools[kind][0]!;
}
