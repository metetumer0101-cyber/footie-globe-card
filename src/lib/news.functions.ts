import { createServerFn } from "@tanstack/react-start";
import type { Country, NewsArticle } from "@/types/news";
import { getSourcesByCountry } from "@/data/news-sources";

/**
 * Parse RSS feed and extract articles
 * Runs on server to avoid CORS issues
 */
async function parseRssFeed(feedUrl: string, sourceName: string): Promise<NewsArticle[]> {
  try {
    const response = await fetch(feedUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });

    if (!response.ok) {
      console.warn(`Feed ${sourceName} returned ${response.status}`);
      return [];
    }

    const text = await response.text();

    // Parse XML
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(text, "text/xml");

    if (xmlDoc.getElementsByTagName("parsererror").length > 0) {
      console.warn(`Invalid XML from ${sourceName}`);
      return [];
    }

    const items = xmlDoc.getElementsByTagName("item");
    const articles: NewsArticle[] = [];

    Array.from(items).slice(0, 5).forEach((item) => {
      try {
        const title = item.getElementsByTagName("title")[0]?.textContent || "No title";
        const link = item.getElementsByTagName("link")[0]?.textContent || "";
        const description = item.getElementsByTagName("description")[0]?.textContent || "";
        const pubDate = item.getElementsByTagName("pubDate")[0]?.textContent;

        if (!link || !title) return;

        // Extract image
        let image = "";
        const contentEncoded = item.getElementsByTagName("content:encoded")[0]?.textContent;
        const mediaContent = item.getElementsByTagName("media:content")[0];

        if (mediaContent?.getAttribute("url")) {
          image = mediaContent.getAttribute("url") || "";
        } else if (contentEncoded) {
          const imgMatch = contentEncoded.match(/<img[^>]+src="([^">]+)"/);
          if (imgMatch) image = imgMatch[1];
        }

        // Get enclosure image
        const enclosure = item.getElementsByTagName("enclosure")[0];
        if (!image && enclosure?.getAttribute("type")?.includes("image")) {
          image = enclosure.getAttribute("url") || "";
        }

        // Clean summary
        const summary = description
          .replace(/<[^>]*>/g, "")
          .substring(0, 200)
          .trim();

        articles.push({
          id: `${sourceName}-${title.substring(0, 50)}`,
          title: title.substring(0, 150),
          summary: summary || title.substring(0, 100),
          image,
          link,
          publishedAt: pubDate ? new Date(pubDate) : new Date(),
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
 * Server function to fetch news by country
 * This runs on the server, avoiding CORS issues
 */
export const getNewsByCountry = createServerFn("GET /api/news").query(
  async (data: { country: Country }) => {
    const sources = getSourcesByCountry(data.country);
    const allArticles: NewsArticle[] = [];

    // Fetch from all sources
    const results = await Promise.allSettled(
      sources.map((source) =>
        parseRssFeed(source.feedUrl, source.name).then((articles) => {
          allArticles.push(...articles);
        })
      )
    );

    // Log any failures
    results.forEach((result) => {
      if (result.status === "rejected") {
        console.error("Feed fetch failed:", result.reason);
      }
    });

    // Remove duplicates and sort
    const uniqueArticles = Array.from(
      new Map(allArticles.map((article) => [article.title.toLowerCase(), article])).values()
    );

    return uniqueArticles.sort(
      (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    );
  }
);
