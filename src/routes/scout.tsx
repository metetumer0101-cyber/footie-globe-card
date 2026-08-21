import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { LayoutGrid, Rows3, Search, SlidersHorizontal, Sparkles, Star, X } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { PlayerFrontCard } from "@/components/cards/PlayerFrontCard";
import { CardDetailModal } from "@/components/analytics/CardDetailModal";
import { ScoutFilters } from "@/components/scout/ScoutFilters";
import { ResultsTable } from "@/components/scout/ResultsTable";
import { useWatchlist } from "@/hooks/use-watchlist";
import {
  applyPreset,
  defaultFilters,
  emptyStats,
  filterAndSort,
  type PresetKey,
  type ScoutFilterState,
  type SortKey,
} from "@/lib/scout";
import type { CardData } from "@/data/football";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/scout")({
  head: () => ({
    meta: [
      { title: "Scout Engine — FootCard" },
      {
        name: "description",
        content:
          "Multi-parametric football scouting: filter by age, market value, contract, stats, league and nation.",
      },
      { property: "og:title", content: "Scout Engine — FootCard" },
      {
        property: "og:description",
        content: "Hunt wonderkids, pace monsters and playmakers with advanced scout filters.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Page,
});

const presets: PresetKey[] = ["wonderkids", "expiring", "pace", "playmakers"];
const sortKeys: SortKey[] = ["scoutRating", "valueM", "age", "potential", "form"];

function Page() {
  const { t } = useTranslation();
  const [filters, setFilters] = useState<ScoutFilterState>({
    ...defaultFilters,
    minStats: { ...emptyStats },
  });
  const [sort, setSort] = useState<SortKey>("scoutRating");
  const [dir, setDir] = useState<"asc" | "desc">("desc");
  const [view, setView] = useState<"grid" | "table">("grid");
  const [drawer, setDrawer] = useState(false);
  const [preset, setPreset] = useState<PresetKey | null>(null);
  const [onlySaved, setOnlySaved] = useState(false);
  const [selected, setSelected] = useState<CardData | null>(null);
  const { has, toggle, ids } = useWatchlist();

  const results = useMemo(() => {
    const list = filterAndSort(filters, sort, dir);
    return onlySaved ? list.filter((p) => ids.includes(p.id)) : list;
  }, [filters, sort, dir, onlySaved, ids]);

  const pickPreset = (key: PresetKey) => {
    if (preset === key) {
      setPreset(null);
      setFilters({ ...defaultFilters, minStats: { ...emptyStats } });
    } else {
      setPreset(key);
      setFilters(applyPreset(key));
    }
  };

  return (
    <AppShell>
      <section className="space-y-4">
        <header className="space-y-1">
          <h1 className="text-2xl font-bold">{t("nav.scout")}</h1>
          <p className="text-sm text-muted-foreground">{t("scout.subtitle")}</p>
        </header>

        <label className="card-surface flex items-center gap-2 rounded-2xl px-3 py-2.5">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            value={filters.query}
            onChange={(e) => setFilters({ ...filters, query: e.target.value })}
            placeholder={t("searchPlaceholder")}
            className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </label>

        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {presets.map((p) => (
            <button
              key={p}
              onClick={() => pickPreset(p)}
              className={cn(
                "flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
                preset === p
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary/50 text-muted-foreground hover:text-foreground",
              )}
            >
              <Sparkles className="h-3.5 w-3.5" />
              {t(`scout.preset.${p}`)}
            </button>
          ))}
          <button
            onClick={() => setOnlySaved((v) => !v)}
            className={cn(
              "flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
              onlySaved
                ? "bg-accent text-accent-foreground"
                : "bg-secondary/50 text-muted-foreground hover:text-foreground",
            )}
          >
            <Star className="h-3.5 w-3.5" />
            {t("scout.watchlist")} ({ids.length})
          </button>
        </div>

        <div className="flex gap-4">
          <aside className="card-surface hidden h-fit w-64 shrink-0 rounded-2xl p-4 lg:block">
            <ScoutFilters value={filters} onChange={(f) => (setPreset(null), setFilters(f))} />
          </aside>

          <div className="min-w-0 flex-1 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setDrawer(true)}
                className="flex items-center gap-1.5 rounded-xl bg-secondary/60 px-3 py-1.5 text-xs font-semibold lg:hidden"
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
                {t("filters")}
              </button>

              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as SortKey)}
                className="rounded-xl bg-secondary/50 px-2.5 py-1.5 text-xs font-semibold outline-none"
              >
                {sortKeys.map((k) => (
                  <option key={k} value={k}>
                    {t(`scout.sort.${k}`)}
                  </option>
                ))}
              </select>
              <button
                onClick={() => setDir((d) => (d === "desc" ? "asc" : "desc"))}
                className="rounded-xl bg-secondary/50 px-2.5 py-1.5 text-xs font-semibold"
              >
                {dir === "desc" ? "↓" : "↑"}
              </button>

              <div className="ms-auto flex items-center gap-1 rounded-xl bg-secondary/50 p-1">
                <button
                  onClick={() => setView("grid")}
                  aria-label={t("scout.gridView")}
                  className={cn(
                    "rounded-lg p-1.5",
                    view === "grid" ? "bg-primary text-primary-foreground" : "text-muted-foreground",
                  )}
                >
                  <LayoutGrid className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setView("table")}
                  aria-label={t("scout.tableView")}
                  className={cn(
                    "rounded-lg p-1.5",
                    view === "table" ? "bg-primary text-primary-foreground" : "text-muted-foreground",
                  )}
                >
                  <Rows3 className="h-4 w-4" />
                </button>
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              {results.length} {t("resultsCount")}
            </p>

            {results.length === 0 ? (
              <p className="card-surface rounded-2xl p-6 text-center text-sm text-muted-foreground">
                {t("noResults")}
              </p>
            ) : view === "table" ? (
              <ResultsTable
                rows={results}
                onSelect={(p) => setSelected(p)}
                isSaved={has}
                onToggleSave={toggle}
              />
            ) : (
              <div className="flex flex-wrap gap-3">
                {results.map((p) => (
                  <div key={p.id} className="relative">
                    <PlayerFrontCard player={p} onClick={() => setSelected(p)} />
                    <button
                      onClick={() => toggle(p.id)}
                      aria-label={t("scout.watchlist")}
                      className="absolute end-2 top-2 rounded-lg bg-background/80 p-1.5 backdrop-blur transition-colors hover:bg-background"
                    >
                      <Star
                        className={cn(
                          "h-3.5 w-3.5",
                          has(p.id) ? "fill-accent text-accent" : "text-muted-foreground",
                        )}
                      />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {drawer && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            onClick={() => setDrawer(false)}
          />
          <div className="absolute inset-y-0 end-0 w-[85%] max-w-sm overflow-y-auto bg-surface p-4 pb-24">
            <button
              onClick={() => setDrawer(false)}
              aria-label={t("close")}
              className="mb-3 ms-auto flex rounded-lg bg-secondary/60 p-1.5"
            >
              <X className="h-4 w-4" />
            </button>
            <ScoutFilters value={filters} onChange={(f) => (setPreset(null), setFilters(f))} />
          </div>
        </div>
      )}

      <CardDetailModal card={selected} onOpenChange={(o) => !o && setSelected(null)} />
    </AppShell>
  );
}
