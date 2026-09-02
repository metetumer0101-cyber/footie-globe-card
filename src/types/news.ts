export type Country = 
  | "turkey"
  | "england"
  | "spain"
  | "italy"
  | "germany"
  | "france"
  | "saudi-arabia"
  | "netherlands"
  | "portugal"
  | "brazil"
  | "usa"
  | "argentina"
  | "belgium";

export interface NewsSource {
  id: string;
  name: string;
  country: Country;
  feedUrl: string;
  website: string;
}

export interface NewsArticle {
  id: string;
  title: string;
  summary: string;
  image?: string;
  link: string;
  publishedAt: Date;
  source: string;
}

export interface HomeNewsResponse {
  country: Country;
  articles: NewsArticle[];
  lastUpdated: Date;
}
