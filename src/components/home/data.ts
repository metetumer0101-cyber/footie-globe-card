export type Player = {
  id: string;
  name: string;
  club: string;
  country: string;
  position: string;
  rating: number;
  age: number;
};

export const playerOfTheDay: Player & {
  stats: { key: string; value: number }[];
} = {
  id: "potd",
  name: "Arda Güler",
  club: "Real Madrid",
  country: "🇹🇷",
  position: "AM",
  rating: 86,
  age: 21,
  stats: [
    { key: "pace", value: 82 },
    { key: "shooting", value: 84 },
    { key: "passing", value: 88 },
    { key: "dribbling", value: 89 },
    { key: "defending", value: 46 },
    { key: "physical", value: 68 },
  ],
};

export const popularPlayers: Player[] = [
  { id: "p1", name: "Kylian Mbappé", club: "Real Madrid", country: "🇫🇷", position: "ST", rating: 91, age: 27 },
  { id: "p2", name: "Erling Haaland", club: "Man City", country: "🇳🇴", position: "ST", rating: 91, age: 26 },
  { id: "p3", name: "Jude Bellingham", club: "Real Madrid", country: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", position: "CM", rating: 90, age: 23 },
  { id: "p4", name: "Vinícius Jr.", club: "Real Madrid", country: "🇧🇷", position: "LW", rating: 90, age: 26 },
  { id: "p5", name: "Rodri", club: "Man City", country: "🇪🇸", position: "DM", rating: 90, age: 30 },
  { id: "p6", name: "Hakan Çalhanoğlu", club: "Inter", country: "🇹🇷", position: "DM", rating: 87, age: 32 },
];

export const futureStars: Player[] = [
  { id: "f1", name: "Lamine Yamal", club: "Barcelona", country: "🇪🇸", position: "RW", rating: 88, age: 19 },
  { id: "f2", name: "Endrick", club: "Real Madrid", country: "🇧🇷", position: "ST", rating: 81, age: 20 },
  { id: "f3", name: "Kenan Yıldız", club: "Juventus", country: "🇹🇷", position: "LW", rating: 82, age: 21 },
  { id: "f4", name: "Warren Zaïre-Emery", club: "PSG", country: "🇫🇷", position: "CM", rating: 83, age: 20 },
  { id: "f5", name: "Pau Cubarsí", club: "Barcelona", country: "🇪🇸", position: "CB", rating: 82, age: 19 },
];

export const popularTeams = [
  { id: "t1", name: "Real Madrid", league: "La Liga", badge: "⚪" },
  { id: "t2", name: "Galatasaray", league: "Süper Lig", badge: "🟡" },
  { id: "t3", name: "Manchester City", league: "Premier League", badge: "🔵" },
  { id: "t4", name: "Bayern München", league: "Bundesliga", badge: "🔴" },
  { id: "t5", name: "Inter", league: "Serie A", badge: "🔷" },
  { id: "t6", name: "PSG", league: "Ligue 1", badge: "🔵" },
];

export const activeCompetitions = [
  { id: "c1", name: "UEFA Champions League", phase: "Group Stage", entrants: 32 },
  { id: "c2", name: "Süper Lig Scout Cup", phase: "Round 4", entrants: 128 },
  { id: "c3", name: "Wonderkid Draft", phase: "Live", entrants: 64 },
];
