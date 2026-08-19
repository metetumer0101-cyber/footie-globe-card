import { forwardRef } from "react";
import { useTranslation } from "react-i18next";
import { Trophy } from "lucide-react";
import { DualRadarChart } from "./DualRadarChart";
import { subtitleOf, type Entity, type RadarPoint } from "@/lib/compare";
import { tierStyles } from "@/data/football";
import { cn } from "@/lib/utils";

type Row = { key: string; label: string; a: number; b: number; aText: string; bText: string };

export const MatchupCard = forwardRef<
  HTMLDivElement,
  {
    a: Entity;
    b: Entity;
    radarA: RadarPoint[];
    radarB: RadarPoint[];
    rows: Row[];
    qr: string | null;
  }
>(function MatchupCard({ a, b, radarA, radarB, rows, qr }, ref) {
  const { t } = useTranslation();
  const aWins = rows.filter((r) => r.a > r.b).length;
  const bWins = rows.filter((r) => r.b > r.a).length;

  return (
    <div
      ref={ref}
      className="flex h-[1350px] w-[1080px] flex-col gap-8 bg-background p-14 text-foreground"
    >
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Trophy className="h-10 w-10 text-accent" />
          <span className="text-4xl font-black tracking-tight">
            Foot<span className="text-primary">Card</span>
          </span>
        </div>
        <span className="rounded-full bg-secondary/60 px-5 py-2 text-2xl font-bold text-muted-foreground">
          {t("cmp.title")}
        </span>
      </header>

      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-6">
        <Side entity={a} accent="primary" wins={aWins} />
        <span className="text-5xl font-black text-muted-foreground">{t("cmp.vs")}</span>
        <Side entity={b} accent="accent" wins={bWins} align="end" />
      </div>

      <div className="rounded-[2rem] bg-surface p-6">
        <DualRadarChart a={radarA} b={radarB} className="mx-auto h-[420px] w-[420px]" />
      </div>

      <ul className="flex-1 space-y-5 rounded-[2rem] bg-surface p-8">
        {rows.slice(0, 8).map((row) => {
          const max = Math.max(row.a, row.b, 1);
          const aw = row.a > row.b;
          const bw = row.b > row.a;
          return (
            <li key={row.key}>
              <div className="mb-2 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-4 text-2xl font-bold">
                <span className={aw ? "text-primary" : "text-muted-foreground"}>{row.aText}</span>
                <span className="text-xl uppercase tracking-wide text-muted-foreground">
                  {row.label}
                </span>
                <span className={cn("text-end", bw ? "text-accent" : "text-muted-foreground")}>
                  {row.bText}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex h-3 flex-1 justify-end overflow-hidden rounded-full bg-secondary/50">
                  <span
                    className={cn("h-full rounded-full", aw ? "bg-primary" : "bg-muted-foreground/60")}
                    style={{ width: `${(row.a / max) * 100}%` }}
                  />
                </div>
                <div className="flex h-3 flex-1 overflow-hidden rounded-full bg-secondary/50">
                  <span
                    className={cn("h-full rounded-full", bw ? "bg-accent" : "bg-muted-foreground/60")}
                    style={{ width: `${(row.b / max) * 100}%` }}
                  />
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      <footer className="flex items-center justify-between">
        <div>
          <p className="text-3xl font-black">footie-globe-card.lovable.app</p>
          <p className="text-xl text-muted-foreground">{t("cmp.scan")}</p>
        </div>
        {qr && <img src={qr} alt="QR" className="h-32 w-32 rounded-2xl bg-foreground p-2" />}
      </footer>
    </div>
  );
});

function Side({
  entity,
  accent,
  wins,
  align,
}: {
  entity: Entity;
  accent: "primary" | "accent";
  wins: number;
  align?: "end";
}) {
  const tier = tierStyles[entity.tier];
  return (
    <div className={cn("min-w-0", align === "end" && "text-end")}>
      <div
        className={cn(
          "mb-3 inline-block rounded-[1.5rem] bg-gradient-to-b p-[3px]",
          tier.frame,
        )}
      >
        <div className="rounded-[1.35rem] bg-surface px-8 py-6">
          <span className="text-6xl">{entity.nation}</span>
        </div>
      </div>
      <h2 className="truncate text-4xl font-black uppercase">{entity.name}</h2>
      <p className="truncate text-2xl text-muted-foreground">{subtitleOf(entity)}</p>
      <p className={cn("mt-2 text-2xl font-bold", accent === "primary" ? "text-primary" : "text-accent")}>
        {wins} ✓
      </p>
    </div>
  );
}
