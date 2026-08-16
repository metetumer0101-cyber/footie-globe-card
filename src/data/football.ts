export type Tier = "bronze" | "silver" | "gold" | "elite" | "icon";

export type CoreStats = {
  pac: number;
  sho: number;
  pas: number;
  dri: number;
  def: number;
  phy: number;
};

export type DeepAttr = { key: string; value: number };

export type PlayerCardData = {
  id: string;
  type: "player";
  name: string;
  club: string;
  clubBadge: string;
  nation: string;
  position: string;
  tier: Tier;
  core: CoreStats;
  age: number;
  heightCm: number;
  weightKg: number;
  foot: "left" | "right" | "both";
  marketValue: string;
  contractUntil: string;
  injuries: string | null;
  technical: DeepAttr[];
  physical: DeepAttr[];
  mental: DeepAttr[];
};

export type ManagerCardData = {
  id: string;
  type: "manager";
  name: string;
  club: string;
  clubBadge: string;
  nation: string;
  tier: Tier;
  winRate: number;
  style: string;
  formation: string;
  age: number;
  marketValue: string;
  contractUntil: string;
  trophies: number;
};

export type CardData = PlayerCardData | ManagerCardData;

const tech = (v: number[]): DeepAttr[] =>
  [
    "finishing",
    "shotPower",
    "longShots",
    "volleys",
    "penalties",
    "curve",
    "freeKick",
    "crossing",
    "shortPassing",
    "longPassing",
    "vision",
    "ballControl",
    "dribblingAttr",
    "heading",
  ].map((key, i) => ({ key, value: v[i] ?? 60 }));

const phys = (v: number[]): DeepAttr[] =>
  ["acceleration", "sprintSpeed", "agility", "balance", "stamina", "strength", "jumping", "reactions"].map(
    (key, i) => ({ key, value: v[i] ?? 60 }),
  );

const ment = (v: number[]): DeepAttr[] =>
  [
    "positioning",
    "offTheBall",
    "composure",
    "aggression",
    "interceptions",
    "marking",
    "standingTackle",
    "slidingTackle",
    "defAwareness",
    "workRate",
    "leadership",
    "flair",
  ].map((key, i) => ({ key, value: v[i] ?? 60 }));

export const players: PlayerCardData[] = [
  {
    id: "mbappe",
    type: "player",
    name: "Kylian Mbappé",
    club: "Real Madrid",
    clubBadge: "⚪",
    nation: "🇫🇷",
    position: "ST",
    tier: "icon",
    core: { pac: 97, sho: 90, pas: 80, dri: 92, def: 36, phy: 78 },
    age: 27,
    heightCm: 182,
    weightKg: 75,
    foot: "right",
    marketValue: "€180M",
    contractUntil: "2029",
    injuries: "Hamstring (2025, 3 weeks)",
    technical: tech([93, 89, 83, 84, 84, 80, 70, 86, 85, 71, 83, 92, 74]),
    physical: phys([97, 97, 93, 82, 88, 77, 88, 93]),
    mental: ment([93, 92, 88, 64, 38, 34, 34, 32, 36, 79, 76, 91]),
  },
  {
    id: "haaland",
    type: "player",
    name: "Erling Haaland",
    club: "Manchester City",
    clubBadge: "🔵",
    nation: "🇳🇴",
    position: "ST",
    tier: "elite",
    core: { pac: 89, sho: 93, pas: 66, dri: 80, def: 45, phy: 88 },
    age: 26,
    heightCm: 195,
    weightKg: 88,
    foot: "left",
    marketValue: "€175M",
    contractUntil: "2034",
    injuries: null,
    technical: tech([96, 94, 85, 88, 85, 74, 62, 55, 68, 60, 74, 90, 90]),
    physical: phys([87, 92, 79, 71, 88, 93, 95, 92]),
    mental: ment([95, 92, 88, 87, 40, 35, 42, 30, 43, 78, 72, 76]),
  },
  {
    id: "bellingham",
    type: "player",
    name: "Jude Bellingham",
    club: "Real Madrid",
    clubBadge: "⚪",
    nation: "🏴󠁧󠁢󠁥󠁮󠁧󠁿",
    position: "CAM",
    tier: "elite",
    core: { pac: 81, sho: 86, pas: 86, dri: 88, def: 78, phy: 85 },
    age: 23,
    heightCm: 186,
    weightKg: 75,
    foot: "right",
    marketValue: "€180M",
    contractUntil: "2029",
    injuries: "Shoulder (2024, surgery)",
    technical: tech([87, 86, 84, 80, 76, 80, 74, 80, 88, 82, 87, 89, 79]),
    physical: phys([80, 82, 82, 80, 90, 84, 82, 89]),
    mental: ment([88, 89, 88, 83, 78, 74, 79, 73, 77, 92, 88, 85]),
  },
  {
    id: "arda",
    type: "player",
    name: "Arda Güler",
    club: "Real Madrid",
    clubBadge: "⚪",
    nation: "🇹🇷",
    position: "CAM",
    tier: "gold",
    core: { pac: 82, sho: 84, pas: 88, dri: 89, def: 46, phy: 68 },
    age: 21,
    heightCm: 176,
    weightKg: 70,
    foot: "left",
    marketValue: "€90M",
    contractUntil: "2029",
    injuries: "Meniscus (2023, 4 months)",
    technical: tech([82, 80, 86, 79, 82, 90, 88, 85, 89, 86, 89, 90, 62]),
    physical: phys([83, 80, 88, 86, 74, 62, 66, 84]),
    mental: ment([84, 83, 85, 58, 48, 42, 46, 38, 45, 74, 68, 92]),
  },
  {
    id: "yamal",
    type: "player",
    name: "Lamine Yamal",
    club: "Barcelona",
    clubBadge: "🔴",
    nation: "🇪🇸",
    position: "RW",
    tier: "gold",
    core: { pac: 90, sho: 82, pas: 85, dri: 93, def: 38, phy: 62 },
    age: 19,
    heightCm: 180,
    weightKg: 72,
    foot: "left",
    marketValue: "€200M",
    contractUntil: "2031",
    injuries: null,
    technical: tech([81, 78, 80, 74, 72, 88, 80, 87, 86, 78, 88, 93, 58]),
    physical: phys([91, 89, 93, 88, 76, 58, 64, 86]),
    mental: ment([83, 86, 84, 52, 40, 33, 35, 30, 38, 72, 62, 94]),
  },
];

export const managers: ManagerCardData[] = [
  {
    id: "pep",
    type: "manager",
    name: "Pep Guardiola",
    club: "Manchester City",
    clubBadge: "🔵",
    nation: "🇪🇸",
    tier: "icon",
    winRate: 73,
    style: "Tiki-Taka",
    formation: "4-3-3",
    age: 55,
    marketValue: "€25M / yr",
    contractUntil: "2027",
    trophies: 40,
  },
  {
    id: "ancelotti",
    type: "manager",
    name: "Carlo Ancelotti",
    club: "Brazil",
    clubBadge: "🟡",
    nation: "🇮🇹",
    tier: "icon",
    winRate: 61,
    style: "Balanced Control",
    formation: "4-4-2",
    age: 66,
    marketValue: "€12M / yr",
    contractUntil: "2026",
    trophies: 32,
  },
];

export const tierStyles: Record<Tier, { frame: string; chip: string; glow: string }> = {
  bronze: {
    frame: "from-[oklch(0.55_0.08_60)] to-[oklch(0.35_0.05_50)]",
    chip: "bg-[oklch(0.55_0.08_60)]/20 text-[oklch(0.78_0.09_60)]",
    glow: "shadow-[0_12px_35px_-18px_oklch(0.55_0.08_60/0.8)]",
  },
  silver: {
    frame: "from-[oklch(0.78_0.01_250)] to-[oklch(0.5_0.01_250)]",
    chip: "bg-[oklch(0.78_0.01_250)]/20 text-[oklch(0.88_0.01_250)]",
    glow: "shadow-[0_12px_35px_-18px_oklch(0.78_0.01_250/0.6)]",
  },
  gold: {
    frame: "from-[oklch(0.85_0.16_88)] to-[oklch(0.6_0.14_70)]",
    chip: "bg-accent/20 text-accent",
    glow: "shadow-[0_12px_35px_-18px_oklch(0.85_0.16_88/0.8)]",
  },
  elite: {
    frame: "from-[oklch(0.72_0.16_162)] to-[oklch(0.45_0.12_190)]",
    chip: "bg-primary/20 text-primary",
    glow: "shadow-[0_12px_35px_-18px_oklch(0.72_0.16_162/0.9)]",
  },
  icon: {
    frame: "from-[oklch(0.9_0.13_95)] via-[oklch(0.75_0.16_162)] to-[oklch(0.6_0.18_300)]",
    chip: "bg-accent/25 text-accent",
    glow: "shadow-[0_14px_40px_-16px_oklch(0.85_0.16_95/0.85)]",
  },
};
