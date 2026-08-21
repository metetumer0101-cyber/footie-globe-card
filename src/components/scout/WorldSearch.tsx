import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useTranslation } from "react-i18next";
import { Globe2, Loader2 } from "lucide-react";
import {
  getLeagueTopPlayers,
  getWorldPlayerCard,
  searchWorldPlayers,
  type WorldPlayer,
} from "@/lib/player-search.functions";
import type { PlayerCardData } from "@/data/football";
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

  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(query), 400);
    return () => window.clearTimeout(id);
  }, [query]);

  const active = debounced.trim().length >= 3;

  const searchQuery = useQuery({
    queryKey: ["world-search", debounced.trim().toLowerCase()],
    queryFn: () => search({ data: { query: debounced.trim() } }),
    enabled: active,
    staleTime: 10 * 60 * 1000,
  });

  const topQuery = useQuery({
    queryKey: ["world-top", league],
    queryFn: () => topPlayers({ data: { leagueId: league } }),
    enabled: !active,
    staleTime: 30 * 60 * 1000,
  });

  const list: WorldPlayer[] = active
    ? (searchQuery.data?.players ?? [])
    : (topQuery.data?.players ?? []);
  const loading = active ? searchQuery.isPending : topQuery.isPending;

  const open = async (player: WorldPlayer) => {
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
        <ul className="grid gap-2 sm:grid-cols-2">
          {list.map((p) => (
            <li key={p.id}>
              <button
                onClick={() => void open(p)}
                className="card-surface flex w-full items-center gap-3 rounded-2xl p-2.5 text-start transition-colors hover:bg-secondary/40"
              >
                <img
                  src={p.photo ?? `https://media.api-sports.io/football/players/${p.id}.png`}
                  alt={p.name}
                  loading="lazy"
                  className="h-11 w-11 shrink-0 rounded-full bg-secondary/50 object-cover"
                />
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
      )}
    </div>
  );
}
