import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { LayoutGrid, Rows3, Search, SlidersHorizontal, Sparkles, Star, X } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { PlayerFrontCard } from "@/components/cards/PlayerFrontCard";
import { CardDetailModal } from "@/components/analytics/CardDetailModal";
import { ScoutFilters } from "@/components/scout/ScoutFilters";
import { ResultsTable } from "@/components/scout/ResultsTable";
import {
  AGE_BUCKETS,
  LEAGUES,
  POS_GROUPS,
  WorldSearch,
  inAgeBucket,
  posGroup,
  type AgeBucket,
  type PosGroup,
  type WorldFilters,
} from "@/components/scout/WorldSearch";
import { useWatchlist } from "@/hooks/use-watchlist";
import {
  applyPreset,
  buildScoutPlayers,
  defaultFilters,
  emptyStats,
  filterAndSort,
  type PresetKey,
  type ScoutFilterState,
  type SortKey,
} from "@/lib/scout";
import { listPublishedCards } from "@/lib/cms.functions";
import { mapPlayerCard } from "@/lib/cms-mappers";
import type { CardData } from "@/data/football";
import { cn } from "@/lib/utils";

type ScoutSearch = { q?: string | undefined };

export const Route = createFileRoute("/scout")({
  validateSearch: (search: Record<string, unknown>): ScoutSearch => {
    const q = search["q"];
    return typeof q === "string" && q.length > 0 ? { q } : {};
  },
  head: () => ({
    meta: [
      { title: "Scout Engine — FootCard" },
      {
        name: "description",
        content:
          "Global football scouting: search every player in the world, then filter by position, league, age and nation.",
      },
      { property: "og:title", content: "Scout Engine — FootCard" },
      {
        property: "og:description",
        content: "Hunt wonderkids, pace monsters and playmakers with a unified global search.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: async () => {
    try {
      const rows = await listPublishedCards({ data: { type: "player", limit: 500 } });
      return rows.map(mapPlayerCard);
    } catch {
      // CMS/seed unavailable during SSR — render an empty (safe) scout state instead of
      // crashing the page with a 500.
      return [];
    }
  },
  component: Page,
});

const presets: PresetKey[] = ["wonderkids", "expiring", "pace", "playmakers"];
const sortKeys: SortKey[] = ["scoutRating", "valueM", "age", "potential", "form"];

/* A broad, honest set of footballing nations for the primary filter. World
   players report their real nationality; any player whose nation isn't listed
   is simply left out when a specific nation is chosen. */
const COMMON_NATIONS = [
  "Argentina",
  "Australia",
  "Austria",
  "Belgium",
  "Brazil",
  "Cameroon",
  "Canada",
  "Colombia",
  "Croatia",
  "Czech Republic",
  "Denmark",
  "Ecuador",
  "England",
  "Egypt",
  "France",
  "Georgia",
  "Germany",
  "Ghana",
  "Greece",
  "Italy",
  "Ivory Coast",
  "Japan",
  "Mexico",
  "Morocco",
  "Netherlands",
  "Nigeria",
  "Norway",
  "Poland",
  "Portugal",
  "Senegal",
  "Serbia",
  "South Korea",
  "Spain",
  "Sweden",
  "Switzerland",
  "Türkiye",
  "Ukraine",
  "United States",
  "Uruguay",
  "Wales",
];

function PrimaryFilters({
  nationOptions,
  world,
  onWorld,
}: {
  nationOptions: string[];
  world: WorldFilters;
  onWorld: (w: WorldFilters) => void;
}) {
  const { t } = useTranslation();
  const set = (patch: Partial<WorldFilters>) => onWorld({ ...world, ...patch });

  return (
    <div className="space-y-4">
      {/* Position group */}
      <div className="space-y-1.5">
        <span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
          {t("scout.filters.position")}
        </span>
        <div className="flex flex-wrap gap-1.5">
          {(["any", ...POS_GROUPS] as const).map((g) => (
            <button
              key={g}
              onClick={() => set({ pos: g })}
              className={cn(
                "rounded-full px-2.5 py-1 text-xs font-semibold transition-colors",
                world.pos === g
                  ? "bg-accent text-accent-foreground"
                  : "bg-secondary/50 text-muted-foreground hover:text-foreground",
              )}
            >
              {g === "any" ? t("scout.any") : g}
            </button>
          ))}
        </div>
      </div>

      {/* League */}
      <div className="space-y-1.5">
        <span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
          {t("scout.league")}
        </span>
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => set({ league: 0 })}
            className={cn(
              "rounded-full px-2.5 py-1 text-xs font-semibold transition-colors",
              world.league === 0
                ? "bg-primary text-primary-foreground"
                : "bg-secondary/50 text-muted-foreground hover:text-foreground",
            )}
          >
            {t("scout.filters.allLeagues")}
          </button>
          {LEAGUES.map((l) => (
            <button
              key={l.id}
              onClick={() => set({ league: l.id })}
              className={cn(
                "rounded-full px-2.5 py-1 text-xs font-semibold transition-colors",
                world.league === l.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary/50 text-muted-foreground hover:text-foreground",
              )}
            >
              {l.name}
            </button>
          ))}
        </div>
      </div>

      {/* Age */}
      <div className="space-y-1.5">
        <span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
          {t("scout.filters.age")}
        </span>
        <select
          value={world.ageBucket}
          onChange={(e) => set({ ageBucket: e.target.value as AgeBucket })}
          className="w-full rounded-xl bg-secondary/50 px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary"
        >
          {AGE_BUCKETS.map((b) => (
            <option key={b.id} value={b.id}>
              {t(`scout.ageBuckets.${b.id}`)}
            </option>
          ))}
        </select>
      </div>

      {/* Nation */}
      <div className="space-y-1.5">
        <span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
          {t("scout.filters.nationality")}
        </span>
        <select
          value={world.nation}
          onChange={(e) => set({ nation: e.target.value })}
          className="w-full rounded-xl bg-secondary/50 px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary"
        >
          <option value="any">{t("scout.any")}</option>
          {nationOptions.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

function Page() {
  const { t } = useTranslation();
  const { q } = Route.useSearch();
  const players = Route.useLoaderData();
  const scoutPlayers = useMemo(() => buildScoutPlayers(players), [players]);
  const [query, setQuery] = useState(q ?? "");
  const [world, setWorld] = useState<WorldFilters>({
    league: 39,
    pos: "any",
    ageBucket: "any",
    nation: "any",
  });
  const [filters, setFilters] = useState<ScoutFilterState>({
    ...defaultFilters(scoutPlayers),
    minStats: { ...emptyStats },
    query: q ?? "",
  });
  const [sort, setSort] = useState<SortKey>("scoutRating");
  const [dir, setDir] = useState<"asc" | "desc">("desc");
  const [view, setView] = useState<"grid" | "table">("grid");
  const [drawer, setDrawer] = useState(false);
  const [preset, setPreset] = useState<PresetKey | null>(null);
  const [onlySaved, setOnlySaved] = useState(false);
  const [selected, setSelected] = useState<CardData | null>(null);
  const { has, toggle, ids } = useWatchlist();

  // Debounced query drives both the world search and the curated picks, so the
  // two pools stay in sync while typing.
  const [debouncedQ, setDebouncedQ] = useState(query);
  useEffect(() => {
    const id = window.setTimeout(() => setDebouncedQ(query), 400);
    return () => window.clearTimeout(id);
  }, [query]);

  const nationOptions = useMemo(
    () =>
      Array.from(new Set([...scoutPlayers.map((p) => p.nationName), ...COMMON_NATIONS])).sort(
        (a, b) => a.localeCompare(b),
      ),
    [scoutPlayers],
  );

  useEffect(() => {
    if (q) setQuery(q);
  }, [q]);

  const results = useMemo(() => {
    let list = filterAndSort(scoutPlayers, { ...filters, query: debouncedQ }, sort, dir);
    // Primary position/age filters apply to the curated pool too, so both pools
    // respond to the same panel.
    if (world.pos !== "any") list = list.filter((p) => posGroup(p.position) === world.pos);
    if (world.ageBucket !== "any") list = list.filter((p) => inAgeBucket(p.age, world.ageBucket));
    return onlySaved ? list.filter((p) => ids.includes(p.id)) : list;
  }, [scoutPlayers, filters, debouncedQ, sort, dir, onlySaved, ids, world.pos, world.ageBucket]);

  const pickPreset = (key: PresetKey) => {
    if (preset === key) {
      setPreset(null);
      setFilters({ ...defaultFilters(scoutPlayers), minStats: { ...emptyStats } });
    } else {
      setPreset(key);
      setFilters(applyPreset(key, [filters.value[0], filters.value[1]]));
    }
  };

  const filterPanel = (
    <>
      <PrimaryFilters nationOptions={nationOptions} world={world} onWorld={setWorld} />
      <div className="border-t border-border/60 pt-4">
        <ScoutFilters
          players={players}
          value={filters}
          onChange={(f) => (setPreset(null), setFilters(f))}
        />
      </div>
    </>
  );

  return (
    <AppShell>
      <section className="space-y-4">
        <header className="space-y-1">
          <h1 className="text-2xl font-bold">{t("nav.scout")}</h1>
          <p className="text-sm text-muted-foreground">{t("scout.subtitle")}</p>
        </header>

        {/* Prominent global search — the single entry point for the whole page. */}
        <label className="card-surface flex items-center gap-2.5 rounded-2xl px-4 py-3.5 focus-within:ring-1 focus-within:ring-primary">
          <Search className="h-5 w-5 shrink-0 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("scout.globalSearch")}
            className="w-full bg-transparent text-base outline-none placeholder:text-muted-foreground"
          />
        </label>

        <div className="flex items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
            <Globe2Icon />
            {t("scout.worldResults")}
          </h2>
          <button
            onClick={() => setDrawer(true)}
            className="flex items-center gap-1.5 rounded-xl bg-secondary/60 px-3 py-1.5 text-xs font-semibold lg:hidden"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            {t("filters")}
          </button>
        </div>

        {/* Primary: real world player search + results */}
        <WorldSearch query={query} filters={world} onFiltersChange={setWorld} />

        {/* Secondary: curated FootCard picks, sharing the same search + filters */}
        <div className="flex items-center gap-2 pt-2">
          <Sparkles className="h-4 w-4 text-accent" />
          <h2 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
            {t("scout.curatedPicks")}
          </h2>
        </div>

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
            {filterPanel}
          </aside>

          <div className="min-w-0 flex-1 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
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
                    view === "grid"
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground",
                  )}
                >
                  <LayoutGrid className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setView("table")}
                  aria-label={t("scout.tableView")}
                  className={cn(
                    "rounded-lg p-1.5",
                    view === "table"
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground",
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
            {filterPanel}
          </div>
        </div>
      )}

      <CardDetailModal card={selected} onOpenChange={(o) => !o && setSelected(null)} />
    </AppShell>
  );
}

function Globe2Icon() {
  return (
    <svg
      className="h-4 w-4 text-muted-foreground"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );
}
