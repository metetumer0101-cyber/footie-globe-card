import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { Globe2, Loader2, Search, X } from "lucide-react";
import { managers, players, tierStyles, type PlayerCardData } from "@/data/football";
import { apiPositionCode, leagueOf, roleFit } from "@/lib/squad";
import { getWorldPlayerCard, searchWorldPlayers } from "@/lib/player-search.functions";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export type PickerTarget =
  | { kind: "starter"; slotId: string; role: string }
  | { kind: "bench"; index: number }
  | { kind: "manager" };

export function PlayerPicker({
  target,
  usedIds,
  currentId,
  onPick,
  onPickWorld,
  onClear,
  onClose,
}: {
  target: PickerTarget | null;
  usedIds: string[];
  currentId: string | null;
  onPick: (id: string) => void;
  onPickWorld: (card: PlayerCardData) => void;
  onClear: () => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [pendingId, setPendingId] = useState<number | null>(null);
  const isManager = target?.kind === "manager";

  useEffect(() => {
    const id = setTimeout(() => setDebounced(query.trim()), 400);
    return () => clearTimeout(id);
  }, [query]);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (isManager) {
      return managers
        .filter((m) => !q || m.name.toLowerCase().includes(q) || m.club.toLowerCase().includes(q))
        .map((m) => ({
          id: m.id,
          name: m.name,
          nation: m.nation,
          club: m.club,
          meta: `${m.formation} · ${m.winRate}%`,
          tier: m.tier,
          fit: 2 as const,
        }));
    }
    const role = target?.kind === "starter" ? target.role : null;
    return players
      .filter((p) => !q || p.name.toLowerCase().includes(q) || p.club.toLowerCase().includes(q))
      .map((p) => ({
        id: p.id,
        name: p.name,
        nation: p.nation,
        club: p.club,
        meta: `${p.position} · ${leagueOf(p.club)}`,
        tier: p.tier,
        fit: role ? roleFit(role, p.position) : (2 as const),
      }))
      .sort((a, b) => b.fit - a.fit || a.name.localeCompare(b.name));
  }, [query, isManager, target]);

  const worldEnabled = !isManager && !!target && debounced.length >= 3;
  const worldQuery = useQuery({
    queryKey: ["squad-picker-world", debounced],
    queryFn: () => searchWorldPlayers({ data: { query: debounced, page: 1 } }),
    enabled: worldEnabled,
    staleTime: 60_000,
  });

  const role = target?.kind === "starter" ? target.role : null;
  const localNames = useMemo(
    () => new Set(players.map((p) => p.name.toLowerCase())),
    [],
  );
  const worldHits = useMemo(() => {
    const rows = worldQuery.data?.players ?? [];
    return rows
      .filter((h) => !h.localId && !localNames.has(h.name.toLowerCase()))
      .map((h) => {
        const pos = apiPositionCode(h.position);
        return { hit: h, pos, fit: role ? roleFit(role, pos) : (2 as const) };
      })
      .sort((a, b) => b.fit - a.fit || a.hit.name.localeCompare(b.hit.name));
  }, [worldQuery.data, localNames, role]);

  const pickWorld = async (playerId: number) => {
    if (pendingId) return;
    setPendingId(playerId);
    try {
      const res = await getWorldPlayerCard({ data: { playerId } });
      const card = res.data?.card;
      if (card) onPickWorld(card);
    } catch {
      /* network hiccup — user can retry */
    } finally {
      setPendingId(null);
    }
  };

  return (
    <Dialog open={!!target} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[85vh] gap-3 overflow-hidden p-4 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">
            {isManager
              ? t("sq.selectManager")
              : target?.kind === "starter"
                ? `${t("sq.selectPlayer")} · ${target.role}`
                : t("sq.selectPlayer")}
          </DialogTitle>
        </DialogHeader>

        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("searchPlaceholder")}
            className="w-full rounded-xl border border-border bg-secondary/40 py-2.5 ps-9 pe-3 text-sm outline-none focus:border-primary/60"
          />
        </div>

        {currentId && (
          <button
            onClick={onClear}
            className="flex items-center justify-center gap-1.5 rounded-xl bg-destructive/15 py-2 text-xs font-bold text-destructive"
          >
            <X className="h-3.5 w-3.5" /> {t("sq.removePlayer")}
          </button>
        )}

        <ul className="-mx-1 max-h-[52vh] space-y-1.5 overflow-y-auto px-1">
          {list.map((item) => {
            const used = usedIds.includes(item.id) && item.id !== currentId;
            return (
              <li key={item.id}>
                <button
                  onClick={() => onPick(item.id)}
                  disabled={used}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-2xl border border-border/60 bg-secondary/30 p-2 text-start transition-colors",
                    used ? "opacity-40" : "hover:border-primary/50",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-b p-[2px]",
                      tierStyles[item.tier].frame,
                    )}
                  >
                    <span className="flex h-full w-full items-center justify-center rounded-[10px] bg-background text-base">
                      {item.nation}
                    </span>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold">{item.name}</span>
                    <span className="block truncate text-[11px] text-muted-foreground">
                      {item.club} · {item.meta}
                    </span>
                  </span>
                  {!isManager && (
                    <span
                      className={cn(
                        "rounded-md px-1.5 py-0.5 text-[9px] font-black uppercase",
                        item.fit === 2
                          ? "bg-primary/20 text-primary"
                          : item.fit === 1
                            ? "bg-accent/20 text-accent"
                            : "bg-destructive/20 text-destructive",
                      )}
                    >
                      {item.fit === 2 ? t("sq.fitPerfect") : item.fit === 1 ? t("sq.fitOk") : t("sq.fitBad")}
                    </span>
                  )}
                </button>
              </li>
            );
          })}

          {!isManager && debounced.length > 0 && debounced.length < 3 && (
            <li className="px-2 py-3 text-center text-[11px] text-muted-foreground">
              {t("scout.worldHint")}
            </li>
          )}

          {worldEnabled && (
            <li className="flex items-center gap-2 px-2 pt-2 text-[10px] font-black uppercase tracking-wide text-muted-foreground">
              <Globe2 className="h-3.5 w-3.5" /> {t("sq.worldSection")}
              {worldQuery.isFetching && <Loader2 className="h-3 w-3 animate-spin" />}
            </li>
          )}

          {worldEnabled && worldQuery.isPending && (
            <li className="px-2 py-3 text-center text-[11px] text-muted-foreground">
              {t("scout.worldSearching")}
            </li>
          )}

          {worldEnabled && !worldQuery.isPending && worldHits.length === 0 && (
            <li className="px-2 py-3 text-center text-[11px] text-muted-foreground">
              {t("sq.worldEmpty")}
            </li>
          )}

          {worldHits.map(({ hit, pos, fit }) => {
            const worldId = `api-${hit.id}`;
            const used = usedIds.includes(worldId);
            const busy = pendingId === hit.id;
            return (
              <li key={worldId}>
                <button
                  onClick={() => void pickWorld(hit.id)}
                  disabled={used || pendingId !== null}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-2xl border border-accent/30 bg-accent/5 p-2 text-start transition-colors",
                    used || pendingId !== null ? "opacity-40" : "hover:border-accent/60",
                  )}
                >
                  <span className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl border border-accent/30 bg-background text-[9px] font-black">
                    {hit.photo ? (
                      <img
                        src={hit.photo}
                        alt={hit.name}
                        loading="lazy"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      pos
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold">{hit.name}</span>
                    <span className="block truncate text-[11px] text-muted-foreground">
                      {[hit.club, pos, hit.nationality].filter(Boolean).join(" · ")}
                    </span>
                  </span>
                  {busy ? (
                    <Loader2 className="h-4 w-4 animate-spin text-accent" />
                  ) : (
                    <span
                      className={cn(
                        "rounded-md px-1.5 py-0.5 text-[9px] font-black uppercase",
                        fit === 2
                          ? "bg-primary/20 text-primary"
                          : fit === 1
                            ? "bg-accent/20 text-accent"
                            : "bg-destructive/20 text-destructive",
                      )}
                    >
                      {fit === 2 ? t("sq.fitPerfect") : fit === 1 ? t("sq.fitOk") : t("sq.fitBad")}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
