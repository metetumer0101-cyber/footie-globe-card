import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { Globe2, Loader2, Search, X } from "lucide-react";
import { tierStyles, type ManagerCardData, type PlayerCardData } from "@/data/football";
import { apiPositionCode, roleFit } from "@/lib/squad";
import { getPlayerDisplayName } from "@/lib/player-name";
import {
  getWorldManagerCard,
  getWorldPlayerCard,
  searchWorldManagers,
  searchWorldPlayers,
} from "@/lib/player-search.functions";
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
  onPickWorld,
  onPickManager,
  onClear,
  onClose,
}: {
  target: PickerTarget | null;
  usedIds: string[];
  currentId: string | null;
  onPickWorld: (card: PlayerCardData) => void;
  onPickManager: (card: ManagerCardData) => void;
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

  const worldEnabled = !isManager && !!target && debounced.length >= 3;
  const worldQuery = useQuery({
    queryKey: ["squad-picker-world", debounced],
    queryFn: () => searchWorldPlayers({ data: { query: debounced, page: 1 } }),
    enabled: worldEnabled,
    staleTime: 60_000,
  });

  const managerEnabled = isManager && !!target && debounced.length >= 3;
  const managerQuery = useQuery({
    queryKey: ["squad-picker-managers", debounced],
    queryFn: () => searchWorldManagers({ data: { query: debounced, page: 1 } }),
    enabled: managerEnabled,
    staleTime: 60_000,
  });

  const role = target?.kind === "starter" ? target.role : null;
  const worldHits = useMemo(() => {
    const rows = worldQuery.data?.players ?? [];
    return rows
      .filter((h) => !h.localId)
      .map((h) => {
        const pos = apiPositionCode(h.position);
        return { hit: h, pos, fit: role ? roleFit(role, pos) : (2 as const) };
      })
      .sort(
        (a, b) =>
          (b.hit.priority ? 1 : 0) - (a.hit.priority ? 1 : 0) || b.fit - a.fit || getPlayerDisplayName(a.hit).localeCompare(getPlayerDisplayName(b.hit)),
      );
  }, [worldQuery.data, role]);

  const managerHits = useMemo(() => {
    const rows = managerQuery.data?.managers ?? [];
    return rows.sort((a, b) => a.name.localeCompare(b.name));
  }, [managerQuery.data]);

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

  const pickManager = async (coachId: number) => {
    if (pendingId) return;
    setPendingId(coachId);
    try {
      const res = await getWorldManagerCard({ data: { coachId } });
      const card = res.data?.card;
      if (card) onPickManager(card);
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
          {isManager && debounced.length > 0 && debounced.length < 3 && (
            <li className="px-2 py-3 text-center text-[11px] text-muted-foreground">
              {t("scout.worldHint")}
            </li>
          )}

          {!isManager && debounced.length > 0 && debounced.length < 3 && (
            <li className="px-2 py-3 text-center text-[11px] text-muted-foreground">
              {t("scout.worldHint")}
            </li>
          )}

          {managerEnabled && (
            <li className="flex items-center gap-2 px-2 pt-2 text-[10px] font-black uppercase tracking-wide text-muted-foreground">
              <Globe2 className="h-3.5 w-3.5" /> {t("sq.worldSection")}
              {managerQuery.isFetching && <Loader2 className="h-3 w-3 animate-spin" />}
            </li>
          )}

          {managerEnabled && managerQuery.isPending && (
            <li className="px-2 py-3 text-center text-[11px] text-muted-foreground">
              {t("scout.worldSearching")}
            </li>
          )}

          {managerEnabled && !managerQuery.isPending && managerHits.length === 0 && (
            <li className="px-2 py-3 text-center text-[11px] text-muted-foreground">
              {t("sq.worldEmpty")}
            </li>
          )}

          {isManager &&
            managerHits.map((m) => {
              const managerId = `sm-${m.id}`;
              const busy = pendingId === m.id;
              return (
                <li key={managerId}>
                  <button
                    onClick={() => void pickManager(m.id)}
                    disabled={pendingId !== null}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-2xl border border-accent/30 bg-accent/5 p-2 text-start transition-colors",
                      pendingId !== null ? "opacity-40" : "hover:border-accent/60",
                    )}
                  >
                    <span className="relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl border border-accent/30 bg-background text-[9px] font-black">
                      {m.photo ? (
                        <img
                          src={m.photo}
                          alt={m.name}
                          loading="lazy"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        m.name.slice(0, 2).toUpperCase()
                      )}
                      {m.flag && (
                        <img
                          src={m.flag}
                          alt=""
                          loading="lazy"
                          className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-[3px] border border-accent/40 object-cover"
                        />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold">{m.name}</span>
                      <span className="block truncate text-[11px] text-muted-foreground">
                        {[m.club, m.nation].filter(Boolean).join(" · ")}
                      </span>
                    </span>
                    {busy && <Loader2 className="h-4 w-4 animate-spin text-accent" />}
                  </button>
                </li>
              );
            })}

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
                  <span className="relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl border border-accent/30 bg-background text-[9px] font-black">
                    {hit.photo ? (
                      <img
                        src={hit.photo}
                        alt={getPlayerDisplayName(hit)}
                        loading="lazy"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      pos
                    )}
                    {hit.flag && (
                      <img
                        src={hit.flag}
                        alt=""
                        loading="lazy"
                        className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-[3px] border border-accent/40 object-cover"
                      />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold">{getPlayerDisplayName(hit)}</span>
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
