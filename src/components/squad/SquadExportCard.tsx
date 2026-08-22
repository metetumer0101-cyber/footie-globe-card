import { forwardRef } from "react";
import { useTranslation } from "react-i18next";
import { Trophy } from "lucide-react";
import {
  formations,
  managerById,
  playerById,
  shortName,
  type Chemistry,
  type SquadRatings,
  type SquadState,
} from "@/lib/squad";
import { tierStyles } from "@/data/football";
import { cn } from "@/lib/utils";

export const SquadExportCard = forwardRef<
  HTMLDivElement,
  { squad: SquadState; chem: Chemistry; ratings: SquadRatings }
>(function SquadExportCard({ squad, chem, ratings }, ref) {
  const { t } = useTranslation();
  const nodes = formations[squad.formation];
  const manager = managerById(squad.managerId);

  return (
    <div ref={ref} className="flex h-[1350px] w-[1080px] flex-col gap-8 bg-background p-14 text-foreground">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Trophy className="h-10 w-10 text-accent" />
          <span className="text-4xl font-black tracking-tight">
            Foot<span className="text-primary">Card</span>
          </span>
        </div>
        <span className="rounded-full bg-secondary/60 px-5 py-2 text-2xl font-bold text-muted-foreground">
          {squad.formation}
        </span>
      </header>

      <div>
        <h1 className="text-6xl font-black leading-tight">{squad.name || t("sq.mySquad")}</h1>
        <p className="mt-2 text-2xl text-muted-foreground">
          {t("sq.chemistry")} {chem.total} · {manager ? manager.name : t("sq.noManager")}
        </p>
      </div>

      <div className="relative aspect-[3/4] w-full overflow-hidden rounded-[2.5rem] border-2 border-primary/25 bg-[radial-gradient(circle_at_50%_0%,oklch(0.32_0.07_162),oklch(0.18_0.04_162)_55%,oklch(0.12_0.03_170))]">
        <svg viewBox="0 0 100 133" className="absolute inset-0 h-full w-full" preserveAspectRatio="none">
          <g fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="0.4">
            <rect x="3" y="3" width="94" height="127" rx="1.5" />
            <line x1="3" y1="66.5" x2="97" y2="66.5" />
            <circle cx="50" cy="66.5" r="12" />
            <rect x="22" y="3" width="56" height="18" />
            <rect x="22" y="112" width="56" height="18" />
          </g>
        </svg>
        {nodes.map((node) => {
          const p = playerById(squad.starters[node.id] ?? null, squad.extras);
          return (
            <div
              key={node.id}
              className="absolute w-[150px] -translate-x-1/2 -translate-y-1/2 text-center"
              style={{ left: `${node.x}%`, top: `${node.y}%` }}
            >
              <div
                className={cn(
                  "mx-auto flex h-[84px] w-[84px] items-center justify-center rounded-3xl bg-gradient-to-b p-[3px]",
                  p ? tierStyles[p.tier].frame : "from-white/20 to-white/5",
                )}
              >
                <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-[20px] bg-background/85 text-4xl">
                  {p ? (
                    p.photo ? (
                      <img src={p.photo} alt={p.name} className="h-full w-full object-cover" />
                    ) : (
                      p.nation
                    )
                  ) : (
                    ""
                  )}
                </div>
              </div>
              <div className="mt-1 truncate text-xl font-black">
                {p ? shortName(p.name) : "—"}
              </div>
              <div className="text-lg font-bold text-primary">{node.role}</div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-4 gap-5">
        {[
          { label: t("sq.att"), value: ratings.att },
          { label: t("sq.mid"), value: ratings.mid },
          { label: t("sq.def"), value: ratings.def },
          { label: t("sq.chemistry"), value: chem.total },
        ].map((s) => (
          <div key={s.label} className="rounded-[2rem] bg-surface p-6 text-center">
            <div className="text-2xl font-bold text-muted-foreground">{s.label}</div>
            <div className="text-6xl font-black text-primary">{s.value}</div>
          </div>
        ))}
      </div>

      <footer className="flex items-center justify-between text-2xl font-bold text-muted-foreground">
        <span>
          {t("sq.squadValue")}: €{ratings.valueM}M · {t("sq.avgAge")}: {ratings.avgAge}
        </span>
        <span className="text-accent">footcard.app</span>
      </footer>
    </div>
  );
});
