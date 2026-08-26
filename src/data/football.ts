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

export type CoachStats = {
  att: number;
  def: number;
  pos: number;
  prs: number;
  dev: number;
  mgt: number;
};

export type TeamStats = {
  att: number;
  mid: number;
  tdef: number;
  pos: number;
  prs: number;
  frm: number;
};

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
  /** Hand-curated deep attributes (optional — not derived from a live provider). */
  technical?: DeepAttr[] | undefined;
  physical?: DeepAttr[] | undefined;
  mental?: DeepAttr[] | undefined;
  /** Real season stats (host can be empty -> UI shows em-dash). */
  goals?: number | undefined;
  assists?: number | undefined;
  appearances?: number | undefined;
  /** Human-readable position name when known (e.g. "Attacker"). */
  positionName?: string | undefined;
  /** Country flag emoji for the identity card. */
  flag?: string | undefined;
  form: number;
  careerGoals: number;
  photo?: string | undefined;
  league?: string | undefined;
  /** API-Football id when known; enables the live current-club overlay. */
  apiId?: number | undefined;
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
  coach: CoachStats;
  form: number;
  matches: number;
};

export type TeamCardData = {
  id: string;
  type: "team";
  name: string;
  club: string;
  clubBadge: string;
  nation: string;
  league: string;
  tier: Tier;
  stats: TeamStats;
  winRate: number;
  goalsFor: number;
  trophies: number;
  squadValue: string;
  avgAge: number;
};

export type CardData = PlayerCardData | ManagerCardData;
export type ComparableEntity = CardData;

export const players: PlayerCardData[] = [
  {
    id: "mbappe",
    type: "player",
    name: "Kylian Mbappé",
    apiId: 278,
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
    form: 92,
    careerGoals: 340,
  },
  {
    id: "haaland",
    type: "player",
    name: "Erling Haaland",
    apiId: 1100,
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
    form: 94,
    careerGoals: 310,
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
    form: 85,
    careerGoals: 120,
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
    form: 80,
    careerGoals: 42,
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
    form: 88,
    careerGoals: 66,
  },
  {
    id: "vinicius",
    type: "player",
    name: "Vinícius Jr.",
    apiId: 762,
    club: "Real Madrid",
    clubBadge: "⚪",
    nation: "🇧🇷",
    position: "LW",
    tier: "elite",
    core: { pac: 95, sho: 84, pas: 80, dri: 92, def: 30, phy: 70 },
    age: 25,
    heightCm: 176,
    weightKg: 73,
    foot: "right",
    marketValue: "€150M",
    contractUntil: "2027",
    injuries: "Hamstring (2024, 5 weeks)",
    form: 87,
    careerGoals: 160,
  },
  {
    id: "wirtz",
    type: "player",
    name: "Florian Wirtz",
    club: "Liverpool",
    clubBadge: "🔴",
    nation: "🇩🇪",
    position: "CAM",
    tier: "elite",
    core: { pac: 84, sho: 82, pas: 90, dri: 91, def: 52, phy: 68 },
    age: 23,
    heightCm: 176,
    weightKg: 70,
    foot: "right",
    marketValue: "€140M",
    contractUntil: "2030",
    injuries: "ACL (2022, 9 months)",
    form: 86,
    careerGoals: 78,
  },
  {
    id: "musiala",
    type: "player",
    name: "Jamal Musiala",
    club: "Bayern München",
    clubBadge: "🔴",
    nation: "🇩🇪",
    position: "CAM",
    tier: "elite",
    core: { pac: 86, sho: 83, pas: 84, dri: 93, def: 44, phy: 66 },
    age: 23,
    heightCm: 184,
    weightKg: 72,
    foot: "right",
    marketValue: "€145M",
    contractUntil: "2030",
    injuries: null,
    form: 84,
    careerGoals: 90,
  },
  {
    id: "saka",
    type: "player",
    name: "Bukayo Saka",
    club: "Arsenal",
    clubBadge: "🔴",
    nation: "🏴󠁧󠁢󠁥󠁮󠁧󠁿",
    position: "RW",
    tier: "gold",
    core: { pac: 87, sho: 84, pas: 85, dri: 88, def: 56, phy: 74 },
    age: 24,
    heightCm: 178,
    weightKg: 72,
    foot: "left",
    marketValue: "€130M",
    contractUntil: "2027",
    injuries: "Hamstring (2024, 3 months)",
    form: 83,
    careerGoals: 105,
  },
  {
    id: "hakimi",
    type: "player",
    name: "Achraf Hakimi",
    club: "Paris Saint-Germain",
    clubBadge: "🔵",
    nation: "🇲🇦",
    position: "RB",
    tier: "gold",
    core: { pac: 93, sho: 76, pas: 82, dri: 84, def: 78, phy: 78 },
    age: 27,
    heightCm: 181,
    weightKg: 73,
    foot: "right",
    marketValue: "€70M",
    contractUntil: "2026",
    injuries: null,
    form: 81,
    careerGoals: 60,
  },
  {
    id: "vandijk",
    type: "player",
    name: "Virgil van Dijk",
    club: "Liverpool",
    clubBadge: "🔴",
    nation: "🇳🇱",
    position: "CB",
    tier: "elite",
    core: { pac: 78, sho: 62, pas: 76, dri: 72, def: 90, phy: 92 },
    age: 34,
    heightCm: 193,
    weightKg: 92,
    foot: "right",
    marketValue: "€25M",
    contractUntil: "2027",
    injuries: "ACL (2020, 10 months)",
    form: 79,
    careerGoals: 70,
  },
  {
    id: "donnarumma",
    type: "player",
    name: "Gianluigi Donnarumma",
    club: "Manchester City",
    clubBadge: "🔵",
    nation: "🇮🇹",
    position: "GK",
    tier: "gold",
    core: { pac: 58, sho: 40, pas: 66, dri: 60, def: 42, phy: 84 },
    age: 27,
    heightCm: 196,
    weightKg: 90,
    foot: "right",
    marketValue: "€45M",
    contractUntil: "2030",
    injuries: null,
    form: 80,
    careerGoals: 0,
  },
  {
    id: "endrick",
    type: "player",
    name: "Endrick",
    club: "Real Madrid",
    clubBadge: "⚪",
    nation: "🇧🇷",
    position: "ST",
    tier: "silver",
    core: { pac: 88, sho: 80, pas: 68, dri: 82, def: 32, phy: 74 },
    age: 19,
    heightCm: 175,
    weightKg: 72,
    foot: "left",
    marketValue: "€55M",
    contractUntil: "2030",
    injuries: null,
    form: 74,
    careerGoals: 35,
  },
  {
    id: "zaire-emery",
    type: "player",
    name: "Warren Zaïre-Emery",
    club: "Paris Saint-Germain",
    clubBadge: "🔵",
    nation: "🇫🇷",
    position: "CM",
    tier: "gold",
    core: { pac: 80, sho: 74, pas: 85, dri: 84, def: 79, phy: 78 },
    age: 20,
    heightCm: 178,
    weightKg: 72,
    foot: "right",
    marketValue: "€75M",
    contractUntil: "2029",
    injuries: null,
    form: 78,
    careerGoals: 22,
  },
  {
    id: "kvaratskhelia",
    type: "player",
    name: "Khvicha Kvaratskhelia",
    club: "Paris Saint-Germain",
    clubBadge: "🔵",
    nation: "🇬🇪",
    position: "LW",
    tier: "gold",
    core: { pac: 88, sho: 82, pas: 82, dri: 91, def: 40, phy: 72 },
    age: 25,
    heightCm: 183,
    weightKg: 78,
    foot: "right",
    marketValue: "€85M",
    contractUntil: "2029",
    injuries: null,
    form: 82,
    careerGoals: 88,
  },
];

export const teams: TeamCardData[] = [
  {
    id: "real-madrid",
    type: "team",
    name: "Real Madrid",
    club: "Real Madrid",
    clubBadge: "⚪",
    nation: "🇪🇸",
    league: "La Liga",
    tier: "icon",
    stats: { att: 94, mid: 90, tdef: 86, pos: 84, prs: 82, frm: 90 },
    winRate: 72,
    goalsFor: 102,
    trophies: 15,
    squadValue: "€1.3B",
    avgAge: 26,
  },
  {
    id: "man-city",
    type: "team",
    name: "Manchester City",
    club: "Manchester City",
    clubBadge: "🔵",
    nation: "🏴󠁧󠁢󠁥󠁮󠁧󠁿",
    league: "Premier League",
    tier: "icon",
    stats: { att: 92, mid: 94, tdef: 87, pos: 96, prs: 90, frm: 86 },
    winRate: 74,
    goalsFor: 96,
    trophies: 9,
    squadValue: "€1.2B",
    avgAge: 27,
  },
  {
    id: "barcelona",
    type: "team",
    name: "Barcelona",
    club: "Barcelona",
    clubBadge: "🔴",
    nation: "🇪🇸",
    league: "La Liga",
    tier: "elite",
    stats: { att: 90, mid: 89, tdef: 80, pos: 92, prs: 88, frm: 84 },
    winRate: 68,
    goalsFor: 98,
    trophies: 5,
    squadValue: "€1.1B",
    avgAge: 24,
  },
  {
    id: "bayern",
    type: "team",
    name: "Bayern München",
    club: "Bayern München",
    clubBadge: "🔴",
    nation: "🇩🇪",
    league: "Bundesliga",
    tier: "elite",
    stats: { att: 91, mid: 88, tdef: 84, pos: 89, prs: 87, frm: 85 },
    winRate: 71,
    goalsFor: 94,
    trophies: 6,
    squadValue: "€950M",
    avgAge: 27,
  },
  {
    id: "galatasaray",
    type: "team",
    name: "Galatasaray",
    club: "Galatasaray",
    clubBadge: "🟡",
    nation: "🇹🇷",
    league: "Süper Lig",
    tier: "gold",
    stats: { att: 85, mid: 80, tdef: 78, pos: 79, prs: 82, frm: 88 },
    winRate: 70,
    goalsFor: 88,
    trophies: 24,
    squadValue: "€280M",
    avgAge: 28,
  },
  {
    id: "inter",
    type: "team",
    name: "Inter",
    club: "Inter",
    clubBadge: "🔷",
    nation: "🇮🇹",
    league: "Serie A",
    tier: "elite",
    stats: { att: 86, mid: 85, tdef: 90, pos: 83, prs: 80, frm: 82 },
    winRate: 66,
    goalsFor: 82,
    trophies: 3,
    squadValue: "€620M",
    avgAge: 29,
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
