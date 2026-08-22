import { useEffect, useMemo, useRef, useState } from "react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useTranslation } from "react-i18next";
import { Globe2, Loader2 } from "lucide-react";
import {
  getLeagueTopPlayers,
  getWorldPlayerCard,
  searchWorldPlayers,
  type WorldPlayer,
} from "@/lib/player-search.functions";
import { players as localPlayers, type PlayerCardData } from "@/data/football";
import { cn } from "@/lib/utils";

const LEAGUES = [
  { id: 39, name: "Premier League" },
  { id: 140, name: "La Liga" },
  { id: 135, name: "Serie A" },
  { id: 78, name: "Bundesliga" },
  { id: 61, name: "Ligue 1" },
  { id: 203, name: "Süper Lig" },
] as const;

export function WorldSearch({
  query,
  onSelect,
}: {
  query: string;
  onSelect: (card: PlayerCardData) => void;
}) {
  const { t } = useTranslation();
  const search = useServerFn(searchWorldPlayers);
  const topPlayers = useServerFn(getLeagueTopPlayers);
  const loadCard = useServerFn(getWorldPlayerCard);
  const [debounced, setDebounced] = useState(query);
  const [league, setLeague] = useState<number>(39);
  const [pending, setPending] = useState<number | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(query), 400);
    return () => window.clearTimeout(id);
  }, [query]);

  const active = debounced.trim().length >= 3;

  const searchQuery = useInfiniteQuery({
    queryKey: ["world-search", debounced.trim().toLowerCase()],
    queryFn: ({ pageParam }) =>
      search({ data: { query: debounced.trim(), page: pageParam } }),
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

  const list: WorldPlayer[] = active ? searched : (topQuery.data?.players ?? []);
  const loading = active ? searchQuery.isPending : topQuery.isPending;

  const { hasNextPage, isFetchingNextPage, fetchNextPage } = searchQuery;

  // Auto-load the next page when the sentinel scrolls into view.
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

  const open = async (player: WorldPlayer) => {
    if (player.localId) {
      const local = localPlayers.find((p) => p.id === player.localId);
      if (local) {
        onSelect(local);
        return;
      }
    }
    setPending(player.id);
    try {
      const result = await loadCard({ data: { playerId: player.id } });
      if (result?.card) onSelect(result.card);
    } finally {
      setPending(null);
    }
  };

  return (
    <div className="space-y-3">
      {!active && (
        <>
          <p className="text-xs text-muted-foreground">{t("scout.worldHint")}</p>
          <div className="flex gap-1.5 overflow-x-auto pb-1">
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
        </>
      )}

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
                  onClick={() => void open(p)}
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
                  {pending === p.id ? (
                    <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" />
                  ) : (
                    <Globe2 className="h-4 w-4 shrink-0 text-muted-foreground" />
                  )}
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
