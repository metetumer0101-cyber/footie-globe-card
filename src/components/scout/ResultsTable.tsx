import { useTranslation } from "react-i18next";
import { Star } from "lucide-react";
import type { ScoutPlayer } from "@/lib/scout";
import { cn } from "@/lib/utils";

export function ResultsTable({
  rows,
  onSelect,
  isSaved,
  onToggleSave,
}: {
  rows: ScoutPlayer[];
  onSelect: (p: ScoutPlayer) => void;
  isSaved: (id: string) => boolean;
  onToggleSave: (id: string) => void;
}) {
  const { t } = useTranslation();
  const cols = ["pac", "sho", "pas", "dri", "def", "phy"] as const;

  return (
    <div className="card-surface overflow-x-auto rounded-2xl">
      <table className="w-full min-w-[720px] text-sm">
        <thead>
          <tr className="border-b border-border text-[11px] uppercase tracking-wide text-muted-foreground">
            <th className="px-3 py-2 text-start font-semibold">{t("scout.player")}</th>
            <th className="px-2 py-2 font-semibold">{t("position")}</th>
            <th className="px-2 py-2 font-semibold">{t("age")}</th>
            <th className="px-2 py-2 font-semibold">{t("marketValue")}</th>
            {cols.map((c) => (
              <th key={c} className="px-2 py-2 font-semibold">
                {t(`attr.${c}`)}
              </th>
            ))}
            <th className="px-2 py-2 font-semibold">{t("scout.rating")}</th>
            <th className="px-2 py-2" />
          </tr>
        </thead>
        <tbody>
          {rows.map((p) => (
            <tr
              key={p.id}
              className="cursor-pointer border-b border-border/50 transition-colors last:border-0 hover:bg-secondary/40"
              onClick={() => onSelect(p)}
            >
              <td className="px-3 py-2">
                <div className="flex items-center gap-2">
                  <span>{p.nation}</span>
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{p.name}</p>
                    <p className="truncate text-[11px] text-muted-foreground">{p.club}</p>
                  </div>
                </div>
              </td>
              <td className="px-2 py-2 text-center font-semibold">{p.position}</td>
              <td className="px-2 py-2 text-center">{p.age}</td>
              <td className="px-2 py-2 text-center font-semibold text-accent">{p.marketValue}</td>
              {cols.map((c) => (
                <td key={c} className="px-2 py-2 text-center">
                  {p.core[c]}
                </td>
              ))}
              <td className="px-2 py-2 text-center font-bold text-primary">{p.scoutRating}</td>
              <td className="px-2 py-2 text-center">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleSave(p.id);
                  }}
                  aria-label={t("scout.watchlist")}
                  className="rounded-lg p-1.5 transition-colors hover:bg-secondary"
                >
                  <Star
                    className={cn(
                      "h-4 w-4",
                      isSaved(p.id) ? "fill-accent text-accent" : "text-muted-foreground",
                    )}
                  />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
