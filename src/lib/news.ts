import type { NewsArticle } from "@/types/news";
import type { Country } from "@/types/news";
import { getSourcesByCountry } from "@/data/news-sources";

/**
 * Parse RSS feed and extract articles
 * Since we can't use external APIs, we'll use CORS proxy for RSS fetching
 */
async function parseRssFeed(feedUrl: string, sourceName: string): Promise<NewsArticle[]> {
  try {
    // Using a CORS proxy to fetch RSS feeds
    const corsProxy = "https://cors-anywhere.herokuapp.com/";
    const response = await fetch(corsProxy + feedUrl, {
      headers: {
        "X-Requested-With": "XMLHttpRequest",
      },
    });

    if (!response.ok) throw new Error(`Failed to fetch feed: ${response.status}`);

    const text = await response.text();
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(text, "text/xml");

    if (xmlDoc.getElementsByTagName("parsererror").length > 0) {
      throw new Error("Invalid XML");
    }

    const items = xmlDoc.getElementsByTagName("item");
    const articles: NewsArticle[] = [];

    Array.from(items).slice(0, 5).forEach((item) => {
      try {
        const title = item.getElementsByTagName("title")[0]?.textContent || "No title";
        const link = item.getElementsByTagName("link")[0]?.textContent || "";
        const description = item.getElementsByTagName("description")[0]?.textContent || "";
        const pubDate = item.getElementsByTagName("pubDate")[0]?.textContent || new Date().toISOString();

        // Extract image from content:encoded or media:content
        let image = "";
        const contentEncoded = item.getElementsByTagName("content:encoded")[0]?.textContent || "";
        const mediaContent = item.getElementsByTagName("media:content")[0]?.getAttribute("url");

        if (mediaContent) {
          image = mediaContent;
        } else if (contentEncoded) {
          const imgMatch = contentEncoded.match(/<img[^>]+src="([^">]+)"/);
          if (imgMatch) image = imgMatch[1];
        }

        // Clean description text
        const summary = description
          .replace(/<[^>]*>/g, "")
          .substring(0, 200)
          .trim();

        articles.push({
          id: `${sourceName}-${title}`,
          title: title.substring(0, 100),
          summary,
          image,
          link,
          publishedAt: new Date(pubDate),
          source: sourceName,
        });
      } catch (error) {
        console.error("Error parsing item:", error);
      }
    });

    return articles;
  } catch (error) {
    console.error(`Error fetching feed from ${feedUrl}:`, error);
    return [];
  }
}

/**
 * Fetch all news articles for a specific country
 */
export async function fetchNewsByCountry(country: Country): Promise<NewsArticle[]> {
  const sources = getSourcesByCountry(country);
  const allArticles: NewsArticle[] = [];

  // Fetch from all sources for the country
  const fetchPromises = sources.map((source) =>
    parseRssFeed(source.feedUrl, source.name)
      .then((articles) => {
        allArticles.push(...articles);
      })
      .catch((error) => {
        console.error(`Failed to fetch from ${source.name}:`, error);
      })
  );

  await Promise.allSettled(fetchPromises);

  // Sort by date and remove duplicates
  const uniqueArticles = Array.from(
    new Map(allArticles.map((article) => [article.title, article])).values()
  );

  return uniqueArticles.sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  );
}

/**
 * Fetch trending news from multiple countries
 */
export async function fetchTrendingNews(countries: Country[] = []): Promise<Map<Country, NewsArticle[]>> {
  const result = new Map<Country, NewsArticle[]>();

  const fetchPromises = countries.map((country) =>
    fetchNewsByCountry(country).then((articles) => {
      result.set(country, articles);
    })
  );

  await Promise.allSettled(fetchPromises);
  return result;
}
