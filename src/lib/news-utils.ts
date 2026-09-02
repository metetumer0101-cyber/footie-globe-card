import type { NewsArticle } from "@/types/news";

/**
 * Clean and parse HTML description to plain text
 */
export function cleanDescription(html: string): string {
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .substring(0, 200)
    .trim();
}

/**
 * Extract image URL from RSS item
 */
export function extractImage(item: Element): string {
  try {
    // Try media:content first
    const mediaContent = item.getElementsByTagName("media:content")[0];
    if (mediaContent?.getAttribute("url")) {
      return mediaContent.getAttribute("url") || "";
    }

    // Try enclosure
    const enclosure = item.getElementsByTagName("enclosure")[0];
    if (enclosure?.getAttribute("type")?.includes("image")) {
      return enclosure.getAttribute("url") || "";
    }

    // Try content:encoded
    const contentEncoded = item.getElementsByTagName("content:encoded")[0]?.textContent;
    if (contentEncoded) {
      const imgMatch = contentEncoded.match(/<img[^>]+src="([^"]+)"/i);
      if (imgMatch) return imgMatch[1];
    }

    // Try description img tag
    const description = item.getElementsByTagName("description")[0]?.textContent;
    if (description) {
      const imgMatch = description.match(/<img[^>]+src="([^"]+)"/i);
      if (imgMatch) return imgMatch[1];
    }
  } catch (error) {
    console.error("Error extracting image:", error);
  }
  return "";
}

/**
 * Remove duplicate articles by title
 */
export function removeDuplicates(articles: NewsArticle[]): NewsArticle[] {
  const seen = new Set<string>();
  return articles.filter((article) => {
    const key = article.title.toLowerCase().trim();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
