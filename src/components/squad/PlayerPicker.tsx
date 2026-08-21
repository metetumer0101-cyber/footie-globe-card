import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Search, X } from "lucide-react";
import { managers, players, tierStyles } from "@/data/football";
import { roleFit, leagueOf } from "@/lib/squad";
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
  onClear,
  onClose,
}: {
  target: PickerTarget | null;
  usedIds: string[];
  currentId: string | null;
  onPick: (id: string) => void;
  onClear: () => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const isManager = target?.kind === "manager";

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
        </ul>
      </DialogContent>
    </Dialog>
  );
}
