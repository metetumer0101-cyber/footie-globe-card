import type { Database } from "@/integrations/supabase/types";
import type {
  PlayerCardData,
  ManagerCardData,
  TeamCardData,
  Tier,
  CoreStats,
  DeepAttr,
  CoachStats,
  TeamStats,
} from "@/data/football";

type CardRow = Database["public"]["Tables"]["cms_cards"]["Row"];

function asTier(t: string | null): Tier {
  if (t === "bronze" || t === "silver" || t === "gold" || t === "elite" || t === "icon") return t;
  return "bronze";
}

function asCoreStats(v: unknown): CoreStats {
  const obj = (v ?? {}) as Record<string, number>;
  return {
    pac: obj["pac"] ?? 60,
    sho: obj["sho"] ?? 60,
    pas: obj["pas"] ?? 60,
    dri: obj["dri"] ?? 60,
    def: obj["def"] ?? 60,
    phy: obj["phy"] ?? 60,
  };
}

function asDeepAttrs(v: unknown): DeepAttr[] {
  if (Array.isArray(v)) return v as DeepAttr[];
  return [];
}

function asCoachStats(v: unknown): CoachStats {
  const obj = (v ?? {}) as Record<string, number>;
  return {
    att: obj.att ?? 60,
    def: obj.def ?? 60,
    pos: obj.pos ?? 60,
    prs: obj.prs ?? 60,
    dev: obj.dev ?? 60,
    mgt: obj.mgt ?? 60,
  };
}

function asTeamStats(v: unknown): TeamStats {
  const obj = (v ?? {}) as Record<string, number>;
  return {
    att: obj.att ?? 60,
    mid: obj.mid ?? 60,
    tdef: obj.tdef ?? 60,
    pos: obj.pos ?? 60,
    prs: obj.prs ?? 60,
    frm: obj.frm ?? 60,
  };
}

export function mapPlayerCard(row: CardRow): PlayerCardData {
  return {
    id: row.slug,
    type: "player",
    name: row.name,
    club: row.club ?? "",
    clubBadge: row.club_badge ?? "",
    nation: row.nation ?? "",
    position: row.position ?? "",
    tier: asTier(row.tier),
    core: asCoreStats(row.core),
    age: row.age ?? 0,
    heightCm: row.height_cm ?? 0,
    weightKg: row.weight_kg ?? 0,
    foot: (row.foot as "left" | "right" | "both") ?? "right",
    marketValue: row.market_value ?? "",
    contractUntil: row.contract_until ?? "",
    injuries: row.injuries ?? null,
    technical: asDeepAttrs(row.technical),
    physical: asDeepAttrs(row.physical),
    mental: asDeepAttrs(row.mental),
    form: row.form ?? 0,
    careerGoals: row.career_goals ?? 0,
    photo: row.photo ?? undefined,
    league: row.league ?? undefined,
    apiId: row.api_id ?? undefined,
  };
}

export function mapManagerCard(row: CardRow): ManagerCardData {
  return {
    id: row.slug,
    type: "manager",
    name: row.name,
    club: row.club ?? "",
    clubBadge: row.club_badge ?? "",
    nation: row.nation ?? "",
    tier: asTier(row.tier),
    winRate: row.win_rate ?? 0,
    style: row.style ?? "",
    formation: row.formation ?? "",
    age: row.age ?? 0,
    marketValue: row.market_value ?? "",
    contractUntil: row.contract_until ?? "",
    trophies: row.trophies ?? 0,
    coach: asCoachStats(row.coach),
    form: row.form ?? 0,
    matches: row.matches ?? 0,
  };
}

export function mapTeamCard(row: CardRow): TeamCardData {
  return {
    id: row.slug,
    type: "team",
    name: row.name,
    club: row.club ?? "",
    clubBadge: row.club_badge ?? "",
    nation: row.nation ?? "",
    league: row.league ?? "",
    tier: asTier(row.tier),
    stats: asTeamStats(row.stats),
    winRate: row.win_rate ?? 0,
    goalsFor: row.goals_for ?? 0,
    trophies: row.trophies ?? 0,
    squadValue: row.squad_value ?? "",
    avgAge: row.avg_age ?? 0,
  };
}

export function mapCardRow(row: CardRow): PlayerCardData | ManagerCardData | TeamCardData {
  if (row.type === "manager") return mapManagerCard(row);
  if (row.type === "team") return mapTeamCard(row);
  return mapPlayerCard(row);
}
