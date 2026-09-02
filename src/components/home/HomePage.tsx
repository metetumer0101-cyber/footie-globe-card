import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useServerFn } from "@tanstack/react-start";
import { ChevronDown, Globe } from "lucide-react";
import { getNewsByCountry } from "@/lib/news.functions";
import { NewsGrid } from "@/components/home/NewsCard";
import { COUNTRIES } from "@/data/news-sources";
import type { Country } from "@/types/news";
import { cn } from "@/lib/utils";

/**
 * Main Home Page - Football News Feed
 * Displays news articles by country with filtering
 */
export function HomePage() {
  const { t } = useTranslation();
  const fetchNews = useServerFn(getNewsByCountry);

  // State
  const [selectedCountry, setSelectedCountry] = useState<Country>("turkey");
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const countryData = COUNTRIES.find((c) => c.id === selectedCountry);

  // Fetch news
  const { data: articles = [], isLoading, error } = useQuery({
    queryKey: ["news", selectedCountry],
    queryFn: async () => {
      try {
        const result = await fetchNews({ data: { country: selectedCountry } });
        return result || [];
      } catch (err) {
        console.error("Error fetching news:", err);
        return [];
      }
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    retry: 2,
  });

  const handleCountryChange = (country: Country) => {
    setSelectedCountry(country);
    setDropdownOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <section className="card-surface glow relative overflow-hidden rounded-3xl p-5">
        <div className="absolute -end-10 -top-10 h-36 w-36 rounded-full gradient-pitch opacity-25 blur-2xl" />
        <div className="relative">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-accent">
            <Globe className="h-3 w-3" />
            {t("news.tag", { defaultValue: "Football News" })}
          </span>
          <h1 className="mt-3 text-2xl font-extrabold leading-tight">
            {t("news.title", { defaultValue: "Football News Around the World" })}
          </h1>
          <p className="mt-1.5 max-w-md text-sm text-muted-foreground">
            {t("news.subtitle", {
              defaultValue:
                "Stay updated with the latest football news from your favorite country. Read stories from trusted sources.",
            })}
          </p>
        </div>
      </section>

      {/* Country Selector */}
      <section className="relative">
        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className={cn(
            "card-surface w-full rounded-2xl px-4 py-3 transition-all",
            "flex items-center justify-between gap-2 text-left",
            dropdownOpen && "ring-2 ring-primary"
          )}
        >
          <div className="flex items-center gap-2">
            <span className="text-2xl">{countryData?.flag}</span>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {t("news.selectCountry", { defaultValue: "Country" })}
              </div>
              <div className="text-base font-bold">{countryData?.name}</div>
            </div>
          </div>
          <ChevronDown
            className={cn(
              "h-5 w-5 text-muted-foreground transition-transform",
              dropdownOpen && "rotate-180"
            )}
          />
        </button>

        {/* Dropdown Menu */}
        {dropdownOpen && (
          <div className="absolute top-full z-20 mt-2 w-full rounded-2xl border border-border bg-background/95 shadow-xl backdrop-blur">
            <div className="grid max-h-96 grid-cols-2 gap-2 overflow-auto p-2 sm:grid-cols-3">
              {COUNTRIES.map((country) => (
                <button
                  key={country.id}
                  onClick={() => handleCountryChange(country.id)}
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-3 py-2 text-left transition-colors",
                    selectedCountry === country.id
                      ? "bg-primary/15 font-semibold text-primary"
                      : "hover:bg-secondary/60"
                  )}
                >
                  <span className="text-lg">{country.flag}</span>
                  <span className="truncate text-sm">{country.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* News Section */}
      <section>
        <h2 className="mb-4 flex items-center gap-2 text-lg font-bold">
          <span className="text-2xl">{countryData?.flag}</span>
          {t("news.latestNews", {
            defaultValue: `Latest news from ${countryData?.name}`,
          })}
        </h2>
        {error && (
          <div className="mb-4 rounded-lg bg-destructive/15 p-4 text-sm text-destructive">
            {t("news.error", { defaultValue: "Failed to load news. Please try again later." })}
          </div>
        )}
        <NewsGrid articles={articles} isLoading={isLoading} />
      </section>

      {/* Info Box */}
      <section className="card-surface rounded-2xl border border-border/50 p-4">
        <p className="text-xs text-muted-foreground">
          {t("news.info", {
            defaultValue:
              "News articles open in a new tab on the original source website. Content is updated regularly from trusted sports news sources.",
          })}
        </p>
      </section>
    </div>
  );
}
