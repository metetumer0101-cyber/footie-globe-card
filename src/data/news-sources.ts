import type { Country, NewsSource } from "@/types/news";

export const NEWS_SOURCES: NewsSource[] = [
  // TURKEY
  {
    id: "fanatik-tr",
    name: "Fanatik",
    country: "turkey",
    feedUrl: "https://www.fanatik.com.tr/rss/futbol",
    website: "https://www.fanatik.com.tr",
  },
  {
    id: "sporx-tr",
    name: "Sporx",
    country: "turkey",
    feedUrl: "https://www.sporx.com/rss/futbol",
    website: "https://www.sporx.com",
  },

  // ENGLAND
  {
    id: "bbc-sport-en",
    name: "BBC Sport",
    country: "england",
    feedUrl: "https://feeds.bbc.co.uk/sport/football/rss.xml",
    website: "https://www.bbc.com/sport/football",
  },
  {
    id: "sky-sports-en",
    name: "Sky Sports",
    country: "england",
    feedUrl: "https://www.skysports.com/rss/football",
    website: "https://www.skysports.com/football",
  },

  // SPAIN
  {
    id: "marca-es",
    name: "Marca",
    country: "spain",
    feedUrl: "https://www.marca.com/rss/futbol.xml",
    website: "https://www.marca.com",
  },
  {
    id: "as-es",
    name: "AS",
    country: "spain",
    feedUrl: "https://as.com/rss/futbol.xml",
    website: "https://www.as.com",
  },

  // ITALY
  {
    id: "gazzetta-it",
    name: "Gazzetta dello Sport",
    country: "italy",
    feedUrl: "https://www.gazzetta.it/rss/calcio.xml",
    website: "https://www.gazzetta.it",
  },
  {
    id: "sky-sport-it",
    name: "Sky Sport Italia",
    country: "italy",
    feedUrl: "https://sport.sky.it/rss/calcio.xml",
    website: "https://sport.sky.it",
  },

  // GERMANY
  {
    id: "kicker-de",
    name: "Kicker",
    country: "germany",
    feedUrl: "https://www.kicker.de/rss/fussball",
    website: "https://www.kicker.de",
  },
  {
    id: "sky-sport-de",
    name: "Sky Sport Deutschland",
    country: "germany",
    feedUrl: "https://www.sky.de/rss/fussball",
    website: "https://www.sky.de",
  },

  // FRANCE
  {
    id: "lequipe-fr",
    name: "L'Équipe",
    country: "france",
    feedUrl: "https://www.lequipe.fr/rss/football.xml",
    website: "https://www.lequipe.fr",
  },
  {
    id: "goal-fr",
    name: "Goal.com France",
    country: "france",
    feedUrl: "https://www.goal.com/fr/feeds/news",
    website: "https://www.goal.com/fr",
  },

  // SAUDI ARABIA
  {
    id: "goal-ar",
    name: "Goal.com Arabic",
    country: "saudi-arabia",
    feedUrl: "https://www.goal.com/ar/feeds/news",
    website: "https://www.goal.com/ar",
  },
  {
    id: "ksa-sports",
    name: "KSA Sports",
    country: "saudi-arabia",
    feedUrl: "https://www.sport360.com/feeds",
    website: "https://www.sport360.com",
  },

  // NETHERLANDS
  {
    id: "espn-nl",
    name: "ESPN NL",
    country: "netherlands",
    feedUrl: "https://nl.espn.com/voetbal/rss.xml",
    website: "https://nl.espn.com",
  },
  {
    id: "voetbal-nl",
    name: "Voetbal.com",
    country: "netherlands",
    feedUrl: "https://www.voetbal.com/rss/nieuws",
    website: "https://www.voetbal.com",
  },

  // PORTUGAL
  {
    id: "goal-pt",
    name: "Goal.com Portugal",
    country: "portugal",
    feedUrl: "https://www.goal.com/pt/feeds/news",
    website: "https://www.goal.com/pt",
  },
  {
    id: "sportv-pt",
    name: "SporTV Portugal",
    country: "portugal",
    feedUrl: "https://www.sportv.pt/rss/futebol",
    website: "https://www.sportv.pt",
  },

  // BRAZIL
  {
    id: "goal-br",
    name: "Goal.com Brasil",
    country: "brazil",
    feedUrl: "https://www.goal.com/pt-br/feeds/news",
    website: "https://www.goal.com/pt-br",
  },
  {
    id: "globo-esportes-br",
    name: "Globo Esportes",
    country: "brazil",
    feedUrl: "https://globoesporte.globo.com/rss/futebol/",
    website: "https://globoesporte.globo.com",
  },

  // USA
  {
    id: "espn-us",
    name: "ESPN",
    country: "usa",
    feedUrl: "https://www.espn.com/espn/rss/football/rss.xml",
    website: "https://www.espn.com/soccer",
  },
  {
    id: "goal-us",
    name: "Goal.com US",
    country: "usa",
    feedUrl: "https://www.goal.com/en-us/feeds/news",
    website: "https://www.goal.com/en-us",
  },

  // ARGENTINA
  {
    id: "goal-ar-arg",
    name: "Goal.com Argentina",
    country: "argentina",
    feedUrl: "https://www.goal.com/es-ar/feeds/news",
    website: "https://www.goal.com/es-ar",
  },
  {
    id: "tnt-sports-ar",
    name: "TNT Sports Argentina",
    country: "argentina",
    feedUrl: "https://www.tntsports.com.ar/rss/futbol",
    website: "https://www.tntsports.com.ar",
  },

  // BELGIUM
  {
    id: "rtbf-be",
    name: "RTBF Sport",
    country: "belgium",
    feedUrl: "https://www.rtbf.be/rss/sport/football.xml",
    website: "https://www.rtbf.be/sport",
  },
  {
    id: "goal-be",
    name: "Goal.com Belgium",
    country: "belgium",
    feedUrl: "https://www.goal.com/nl-be/feeds/news",
    website: "https://www.goal.com/nl-be",
  },
];

export function getSourcesByCountry(country: Country): NewsSource[] {
  return NEWS_SOURCES.filter((source) => source.country === country);
}

export const COUNTRIES: { id: Country; name: string; flag: string }[] = [
  { id: "turkey", name: "Türkiye", flag: "🇹🇷" },
  { id: "england", name: "İngiltere", flag: "🇬🇧" },
  { id: "spain", name: "İspanya", flag: "🇪🇸" },
  { id: "italy", name: "İtalya", flag: "🇮🇹" },
  { id: "germany", name: "Almanya", flag: "🇩🇪" },
  { id: "france", name: "Fransa", flag: "🇫🇷" },
  { id: "saudi-arabia", name: "Suudi Arabistan", flag: "🇸🇦" },
  { id: "netherlands", name: "Hollanda", flag: "🇳🇱" },
  { id: "portugal", name: "Portekiz", flag: "🇵🇹" },
  { id: "brazil", name: "Brezilya", flag: "🇧🇷" },
  { id: "usa", name: "Amerika", flag: "🇺🇸" },
  { id: "argentina", name: "Arjantin", flag: "🇦🇷" },
  { id: "belgium", name: "Belçika", flag: "🇧🇪" },
];
