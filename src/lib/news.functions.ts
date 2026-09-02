import { createServerFn } from "@tanstack/react-start";
import type { Country, NewsArticle } from "@/types/news";
import { getSourcesByCountry } from "@/data/news-sources";
import { cleanDescription, extractImage, removeDuplicates } from "@/lib/news-utils";

/**
 * Parse a single RSS feed
 */
async function parseRssFeed(feedUrl: string, sourceName: string): Promise<NewsArticle[]> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(feedUrl, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.warn(`Feed ${sourceName} (${feedUrl}) returned ${response.status}`);
      return [];
    }

    const text = await response.text();

    // Parse XML
    if (typeof DOMParser === "undefined") {
      // Node.js environment
      return parseRssFeedNode(text, sourceName);
    }

    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(text, "text/xml");

    if (xmlDoc.getElementsByTagName("parsererror").length > 0) {
      console.warn(`Invalid XML from ${sourceName}`);
      return [];
    }

    return extractArticles(xmlDoc, sourceName);
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      console.warn(`Feed ${sourceName} request timed out`);
    } else {
      console.error(`Error fetching feed from ${feedUrl}:`, error);
    }
    return [];
  }
}

/**
 * Parse RSS feed using Node.js (for server-side)
 */
function parseRssFeedNode(xmlString: string, sourceName: string): NewsArticle[] {
  try {
    // Simple regex-based XML parsing for Node.js
    const articles: NewsArticle[] = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    let match;

    while ((match = itemRegex.exec(xmlString)) !== null) {
      const itemText = match[1];

      const titleMatch = itemText.match(/<title>([\s\S]*?)<\/title>/);
      const linkMatch = itemText.match(/<link>([\s\S]*?)<\/link>/);
      const descriptionMatch = itemText.match(/<description>([\s\S]*?)<\/description>/);
      const pubDateMatch = itemText.match(/<pubDate>([\s\S]*?)<\/pubDate>/);
      const imageMatch = itemText.match(
        /<media:content[^>]*url="([^"]+)"|<enclosure[^>]*url="([^"]+)"|<img[^>]*src="([^"]+)"/
      );

      const title = titleMatch ? titleMatch[1].replace(/<[^>]*>/g, "").trim() : "";
      const link = linkMatch ? linkMatch[1].trim() : "";
      const description = descriptionMatch ? descriptionMatch[1].replace(/<[^>]*>/g, "").trim() : "";
      const pubDate = pubDateMatch ? pubDateMatch[1].trim() : new Date().toISOString();
      const image = imageMatch ? imageMatch[1] || imageMatch[2] || imageMatch[3] : "";

      if (title && link) {
        articles.push({
          id: `${sourceName}-${title.substring(0, 50)}`,
          title: title.substring(0, 150),
          summary: description ? description.substring(0, 200) : title.substring(0, 100),
          image,
          link,
          publishedAt: new Date(pubDate),
          source: sourceName,
        });
      }

      if (articles.length >= 5) break;
    }

    return articles;
  } catch (error) {
    console.error(`Error parsing RSS feed in Node:`, error);
    return [];
  }
}

/**
 * Extract articles from parsed XML
 */
function extractArticles(xmlDoc: XMLDocument, sourceName: string): NewsArticle[] {
  const items = xmlDoc.getElementsByTagName("item");
  const articles: NewsArticle[] = [];

  Array.from(items).slice(0, 5).forEach((item) => {
    try {
      const title = item.getElementsByTagName("title")[0]?.textContent || "";
      const link = item.getElementsByTagName("link")[0]?.textContent || "";
      const description = item.getElementsByTagName("description")[0]?.textContent || "";
      const pubDate = item.getElementsByTagName("pubDate")[0]?.textContent;

      if (!link || !title) return;

      const image = extractImage(item);
      const summary = cleanDescription(description) || title.substring(0, 100);

      articles.push({
        id: `${sourceName}-${title.substring(0, 50)}`,
        title: title.substring(0, 150),
        summary,
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
}

/**
 * Server function to fetch news by country
 * Runs entirely on the server to avoid CORS issues
 */
export const getNewsByCountry = createServerFn("GET /api/news").query(
  async (data: { country: Country }) => {
    try {
      const sources = getSourcesByCountry(data.country);
      const allArticles: NewsArticle[] = [];

      // Fetch from all sources in parallel
      const results = await Promise.allSettled(
        sources.map(async (source) => {
          const articles = await parseRssFeed(source.feedUrl, source.name);
          return articles;
        })
      );

      // Collect successful results
      results.forEach((result) => {
        if (result.status === "fulfilled") {
          allArticles.push(...result.value);
        }
      });

      // Remove duplicates and sort by date
      const unique = removeDuplicates(allArticles);
      return unique.sort(
        (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
      );
    } catch (error) {
      console.error("Error in getNewsByCountry:", error);
      return [];
    }
  }
);
