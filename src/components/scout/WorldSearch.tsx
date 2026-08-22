import { useEffect, useMemo, useRef, useState } from "react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { ChevronRight, Loader2, RotateCcw } from "lucide-react";
import {
  getLeagueTopPlayers,
  searchWorldPlayers,
  type WorldPlayer,
} from "@/lib/player-search.functions";
import { cn } from "@/lib/utils";

const LEAGUES = [
  { id: 39, name: "Premier League" },
  { id: 140, name: "La Liga" },
  { id: 135, name: "Serie A" },
  { id: 78, name: "Bundesliga" },
  { id: 61, name: "Ligue 1" },
  { id: 203, name: "Süper Lig" },
] as const;

type PosGroup = "GK" | "DEF" | "MID" | "ATT";
const POS_GROUPS: PosGroup[] = ["GK", "DEF", "MID", "ATT"];

/** Map any position label (API long names or FootCard codes) to a group. */
function posGroup(position?: string): PosGroup | null {
  const p = (position ?? "").toLowerCase();
  if (!p) return null;
  if (p.includes("goal") || p === "gk") return "GK";
  if (
    p.includes("def") ||
    ["cb", "lb", "rb", "lwb", "rwb", "sw"].includes(p)
  )
    return "DEF";
  if (
    p.includes("mid") ||
    ["cm", "cdm", "cam", "lm", "rm", "dm", "amf"].includes(p)
  )
    return "MID";
  if (
    p.includes("att") ||
    p.includes("forw") ||
    p.includes("strik") ||
    ["st", "cf", "lw", "rw", "ss"].includes(p)
  )
    return "ATT";
  return null;
}

type AgeBucket = "any" | "u21" | "b22_26" | "b27_31" | "o31";
const AGE_BUCKETS: { id: AgeBucket; min?: number; max?: number }[] = [
  { id: "any" },
  { id: "u21", max: 21 },
  { id: "b22_26", min: 22, max: 26 },
  { id: "b27_31", min: 27, max: 31 },
  { id: "o31", min: 32 },
];

function inAgeBucket(age: number | undefined, bucket: AgeBucket): boolean {
  if (bucket === "any") return true;
  if (age == null) return false;
  const b = AGE_BUCKETS.find((x) => x.id === bucket);
  if (!b) return true;
  if (b.min != null && age < b.min) return false;
  if (b.max != null && age > b.max) return false;
  return true;
}

export function WorldSearch({ query }: { query: string }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const search = useServerFn(searchWorldPlayers);
  const topPlayers = useServerFn(getLeagueTopPlayers);
  const [debounced, setDebounced] = useState(query);
  // league 0 = all leagues (search mode); browse mode always picks a league.
  const [league, setLeague] = useState<number>(39);
  const [pos, setPos] = useState<PosGroup | "any">("any");
  const [ageBucket, setAgeBucket] = useState<AgeBucket>("any");
  const [nation, setNation] = useState<string>("any");
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(query), 400);
    return () => window.clearTimeout(id);
  }, [query]);

  const active = debounced.trim().length >= 3;
  const searchLeague = active ? league : 0;

  const searchQuery = useInfiniteQuery({
    queryKey: ["world-search", debounced.trim().toLowerCase(), searchLeague],
    queryFn: ({ pageParam }) =>
      search({
        data: {
          query: debounced.trim(),
          page: pageParam,
          ...(searchLeague > 0 ? { leagueId: searchLeague } : {}),
        },
      }),
    initialPageParam: 1,
    getNextPageParam: (last) =>
      last.paging.current < last.paging.total ? last.paging.current + 1 : undefined,
    enabled: active,
    staleTime: 10 * 60 * 1000,
  });

  const topQuery = useQuery({
    queryKey: ["world-top", league],
    queryFn: () => topPlayers({ data: { leagueId: league } }),
    enabled: !active,
    staleTime: 30 * 60 * 1000,
  });

  // Merge all loaded pages, dropping duplicate player ids (the API can repeat
  // entries across page boundaries).
  const searched = useMemo(() => {
    const seen = new Set<number>();
    return (searchQuery.data?.pages ?? [])
      .flatMap((pg) => pg.players)
      .filter((p) => (seen.has(p.id) ? false : (seen.add(p.id), true)));
  }, [searchQuery.data]);

  const rawList: WorldPlayer[] = active ? searched : (topQuery.data?.players ?? []);
  const loading = active ? searchQuery.isPending : topQuery.isPending;

  // Nationality options derived from whatever is currently loaded.
  const nations = useMemo(
    () =>
      [...new Set(rawList.map((p) => p.nationality).filter((n): n is string => Boolean(n)))].sort(
        (a, b) => a.localeCompare(b),
      ),
    [rawList],
  );

  const filtersActive = pos !== "any" || ageBucket !== "any" || nation !== "any";

  const list = useMemo(
    () =>
      rawList.filter((p) => {
        if (pos !== "any" && posGroup(p.position) !== pos) return false;
        if (!inAgeBucket(p.age, ageBucket)) return false;
        if (nation !== "any" && p.nationality !== nation) return false;
        return true;
      }),
    [rawList, pos, ageBucket, nation],
  );

  const resetFilters = () => {
    setPos("any");
    setAgeBucket("any");
    setNation("any");
  };

  const { hasNextPage, isFetchingNextPage, fetchNextPage } = searchQuery;

  // Auto-load the next page when the sentinel scrolls into view. Also keep
  // loading while client-side filters hide everything but more pages exist.
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !active) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting) && hasNextPage && !isFetchingNextPage) {
          void fetchNextPage();
        }
      },
      { rootMargin: "240px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [active, hasNextPage, isFetchingNextPage, fetchNextPage]);

  useEffect(() => {
    if (active && !loading && list.length === 0 && hasNextPage && !isFetchingNextPage) {
      void fetchNextPage();
    }
  }, [active, loading, list.length, hasNextPage, isFetchingNextPage, fetchNextPage]);

  const open = (player: WorldPlayer) => {
    void navigate({
      to: "/player/$id",
      params: { id: player.localId ?? `api-${player.id}` },
    });
  };

  return (
    <div className="space-y-3">
      {!active && <p className="text-xs text-muted-foreground">{t("scout.worldHint")}</p>}

      {/* League selector — pick the browse league, or scope the search. */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {active && (
          <button
            onClick={() => setLeague(0)}
            className={cn(
              "shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
              league === 0
                ? "bg-primary text-primary-foreground"
                : "bg-secondary/50 text-muted-foreground hover:text-foreground",
            )}
          >
            {t("scout.filters.allLeagues")}
          </button>
        )}
        {LEAGUES.map((l) => (
          <button
            key={l.id}
            onClick={() => setLeague(l.id)}
            className={cn(
              "shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
              league === l.id
                ? "bg-primary text-primary-foreground"
                : "bg-secondary/50 text-muted-foreground hover:text-foreground",
            )}
          >
            {l.name}
          </button>
        ))}
      </div>

      {/* Position / age / nationality filters (applied to loaded results). */}
      <div className="card-surface space-y-2 rounded-2xl p-2.5">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          <span className="shrink-0 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            {t("scout.filters.position")}
          </span>
          {(["any", ...POS_GROUPS] as const).map((g) => (
            <button
              key={g}
              onClick={() => setPos(g)}
              className={cn(
                "shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold transition-colors",
                pos === g
                  ? "bg-accent text-accent-foreground"
                  : "bg-secondary/50 text-muted-foreground hover:text-foreground",
              )}
            >
              {g === "any" ? t("scout.any") : g}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span className="font-semibold uppercase tracking-wide">
              {t("scout.filters.age")}
            </span>
            <select
              value={ageBucket}
              onChange={(e) => setAgeBucket(e.target.value as AgeBucket)}
              className="rounded-lg border border-border bg-secondary/60 px-2 py-1 text-[11px] font-semibold text-foreground"
            >
              {AGE_BUCKETS.map((b) => (
                <option key={b.id} value={b.id}>
                  {t(`scout.ageBuckets.${b.id}`)}
                </option>
              ))}
            </select>
          </label>
          <label className="flex min-w-0 flex-1 items-center gap-1.5 text-[11px] text-muted-foreground">
            <span className="shrink-0 font-semibold uppercase tracking-wide">
              {t("scout.filters.nationality")}
            </span>
            <select
              value={nation}
              onChange={(e) => setNation(e.target.value)}
              className="min-w-0 flex-1 rounded-lg border border-border bg-secondary/60 px-2 py-1 text-[11px] font-semibold text-foreground"
            >
              <option value="any">{t("scout.any")}</option>
              {nations.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
          {filtersActive && (
            <button
              onClick={resetFilters}
              className="flex shrink-0 items-center gap-1 rounded-lg bg-secondary/60 px-2 py-1 text-[11px] font-semibold text-muted-foreground transition-colors hover:text-foreground"
            >
              <RotateCcw className="h-3 w-3" />
              {t("scout.reset")}
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <p className="card-surface flex items-center justify-center gap-2 rounded-2xl p-6 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          {t("scout.worldSearching")}
        </p>
      ) : list.length === 0 ? (
        <p className="card-surface rounded-2xl p-6 text-center text-sm text-muted-foreground">
          {t("noResults")}
        </p>
      ) : (
        <>
          <ul className="grid gap-2 sm:grid-cols-2">
            {list.map((p) => (
              <li key={p.id}>
                <button
                  onClick={() => open(p)}
                  className="card-surface flex w-full items-center gap-3 rounded-2xl p-2.5 text-start transition-colors hover:bg-secondary/40"
                >
                  {p.photo ? (
                    <img
                      src={p.photo}
                      alt={p.name}
                      loading="lazy"
                      className="h-11 w-11 shrink-0 rounded-full bg-secondary/50 object-cover"
                    />
                  ) : (
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-secondary/50 text-xs font-bold text-muted-foreground">
                      {p.name.slice(0, 2).toUpperCase()}
                    </span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{p.name}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {[p.club, p.position, p.nationality, p.age ? `${p.age}` : null]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                </button>
              </li>
            ))}
          </ul>

          {active && (
            <div ref={sentinelRef} className="flex justify-center pt-1">
              {isFetchingNextPage ? (
                <p className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t("scout.loadingMore")}
                </p>
              ) : hasNextPage ? (
                <button
                  onClick={() => void fetchNextPage()}
                  className="rounded-xl bg-secondary/60 px-4 py-2 text-xs font-semibold transition-colors hover:bg-secondary"
                >
                  {t("scout.loadMore")}
                </button>
              ) : null}
            </div>
          )}
        </>
      )}
    </div>
  );
}
