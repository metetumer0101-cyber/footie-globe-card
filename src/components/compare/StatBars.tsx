import { useTranslation } from "react-i18next";
import type { Metric, RadarPoint } from "@/lib/compare";
import { cn } from "@/lib/utils";

type Row = { key: string; a: number; b: number; label: string; aText: string; bText: string };

export function buildRows(
  radarA: RadarPoint[],
  radarB: RadarPoint[],
  metrics: Metric[],
  t: (k: string) => string,
): Row[] {
  const radarRows = radarA.map((p, i) => ({
    key: `r-${p.key}`,
    a: p.value,
    b: radarB[i]?.value ?? 0,
    label: t(`attr.${p.key}`),
    aText: `${p.value}`,
    bText: `${radarB[i]?.value ?? 0}`,
  }));
  const metricRows = metrics.map((m) => ({
    key: `m-${m.key}`,
    a: m.a,
    b: m.b,
    label: t(`cmp.${m.key}`),
    aText: m.display ? m.display(m.a) : `${m.a}`,
    bText: m.display ? m.display(m.b) : `${m.b}`,
  }));
  return [...radarRows, ...metricRows];
}

export function StatBars({ rows }: { rows: Row[] }) {
  const { t } = useTranslation();
  return (
    <ul className="space-y-3" aria-label={t("cmp.statsTitle")}>
      {rows.map((row) => {
        const max = Math.max(row.a, row.b, 1);
        const aWins = row.a > row.b;
        const bWins = row.b > row.a;
        return (
          <li key={row.key}>
            <div className="mb-1 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 text-xs font-bold">
              <span
                className={cn(
                  "truncate text-start",
                  aWins ? "text-primary drop-shadow-[0_0_8px_var(--color-primary)]" : "text-muted-foreground",
                )}
              >
                {row.aText}
              </span>
              <span className="truncate text-[10px] uppercase tracking-wide text-muted-foreground">
                {row.label}
              </span>
              <span
                className={cn(
                  "truncate text-end",
                  bWins ? "text-accent drop-shadow-[0_0_8px_var(--color-accent)]" : "text-muted-foreground",
                )}
              >
                {row.bText}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <div className="flex h-1.5 flex-1 justify-end overflow-hidden rounded-full bg-secondary/50">
                <span
                  className={cn("h-full rounded-full", aWins ? "bg-primary" : "bg-muted-foreground/60")}
                  style={{ width: `${(row.a / max) * 100}%` }}
                />
              </div>
              <div className="flex h-1.5 flex-1 overflow-hidden rounded-full bg-secondary/50">
                <span
                  className={cn("h-full rounded-full", bWins ? "bg-accent" : "bg-muted-foreground/60")}
                  style={{ width: `${(row.b / max) * 100}%` }}
                />
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
