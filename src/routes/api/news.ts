import { getNewsByCountry } from "@/lib/news.functions";
import type { Country } from "@/types/news";

/**
 * API endpoint for fetching news by country
 * GET /api/news?country=turkey
 */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const country = url.searchParams.get("country") as Country | null;

    if (!country) {
      return new Response(JSON.stringify({ error: "Missing country parameter" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Call the server function
    const articles = await getNewsByCountry.queryFn({ country });

    return new Response(JSON.stringify(articles), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=600",
      },
    });
  } catch (error) {
    console.error("API Error:", error);
    return new Response(JSON.stringify({ error: "Failed to fetch news" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
