import { createServerFn } from "@tanstack/react-start";
import { fetchNewsByCountry } from "@/lib/news";
import type { Country } from "@/types/news";

/**
 * Server function to fetch news by country
 * Runs on the server to avoid CORS issues with RSS feeds
 */
export const getNewsByCountry = createServerFn("GET /api/news")
  .query(async (data: { country: Country }) => {
    return await fetchNewsByCountry(data.country);
  });
