import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Search, SlidersHorizontal } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { PlayerFrontCard } from "@/components/cards/PlayerFrontCard";
import { CardDetailModal } from "@/components/analytics/CardDetailModal";
import { players, type CardData, type Tier } from "@/data/football";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/scout")({
  head: () => ({
    meta: [
      { title: "Scout — FootCard" },
      { name: "description", content: "Find and shortlist football talents with advanced scouting filters." },
      { property: "og:title", content: "Scout — FootCard" },
      { property: "og:description", content: "Find and shortlist football talents with advanced scouting filters." },
    ],
  }),
  component: Page,
});

function Page() {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [position, setPosition] = useState<string>("all");
  const [tier, setTier] = useState<string>("all");
  const [selected, setSelected] = useState<CardData | null>(null);

  const positions = useMemo(
    () => ["all", ...Array.from(new Set(players.map((p) => p.position)))],
    [],
  );
  const tiers: string[] = ["all", "gold", "elite", "icon"];

  const results = players.filter((p) => {
    const q = query.trim().toLowerCase();
    const matchesQuery =
      !q || p.name.toLowerCase().includes(q) || p.club.toLowerCase().includes(q);
    return (
      matchesQuery &&
      (position === "all" || p.position === position) &&
      (tier === "all" || p.tier === (tier as Tier))
    );
  });

  return (
    <AppShell>
      <section className="space-y-4">
        <h1 className="text-2xl font-bold">{t("nav.scout")}</h1>

        <label className="card-surface flex items-center gap-2 rounded-2xl px-3 py-2.5">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("searchPlaceholder")}
            className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </label>

        <div className="space-y-2">
          <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-accent">
            <SlidersHorizontal className="h-3.5 w-3.5" />
            {t("filters")}
          </span>
          <div className="flex flex-wrap gap-1.5">
            {positions.map((p) => (
              <button
                key={p}
                onClick={() => setPosition(p)}
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-semibold transition-colors",
                  position === p
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary/50 text-muted-foreground hover:text-foreground",
                )}
              >
                {p === "all" ? t("allPositions") : p}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {tiers.map((tr) => (
              <button
                key={tr}
                onClick={() => setTier(tr)}
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-semibold transition-colors",
                  tier === tr
                    ? "bg-accent text-accent-foreground"
                    : "bg-secondary/50 text-muted-foreground hover:text-foreground",
                )}
              >
                {tr === "all" ? t("allTiers") : t(tr)}
              </button>
            ))}
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          {results.length} {t("resultsCount")}
        </p>

        {results.length === 0 ? (
          <p className="card-surface rounded-2xl p-6 text-center text-sm text-muted-foreground">
            {t("noResults")}
          </p>
        ) : (
          <div className="flex flex-wrap gap-3">
            {results.map((p) => (
              <PlayerFrontCard key={p.id} player={p} onClick={() => setSelected(p)} />
            ))}
          </div>
        )}
      </section>

      <CardDetailModal card={selected} onOpenChange={(o) => !o && setSelected(null)} />
    </AppShell>
  );
}
