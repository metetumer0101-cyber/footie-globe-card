import { useTranslation } from "react-i18next";
import { ClipboardList, Percent, LayoutGrid } from "lucide-react";
import { tierStyles, type ManagerCardData } from "@/data/football";
import { cn } from "@/lib/utils";

export function ManagerFrontCard({
  manager,
  onClick,
}: {
  manager: ManagerCardData;
  onClick?: () => void;
}) {
  const { t } = useTranslation();
  const tier = tierStyles[manager.tier];

  return (
    <button
      onClick={onClick}
      aria-label={`${manager.name} — ${t("tapForDetails")}`}
      className={cn(
        "group w-52 shrink-0 snap-start rounded-3xl bg-gradient-to-b p-[2px] text-start transition-transform duration-200 hover:scale-[1.03] active:scale-[0.98]",
        tier.frame,
        tier.glow,
      )}
    >
      <div className="flex h-full flex-col rounded-[22px] bg-surface p-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <span className={cn("rounded-lg px-1.5 py-0.5 text-[10px] font-black uppercase", tier.chip)}>
            {t("manager")}
          </span>
          <span className="flex items-center gap-1 text-base leading-none">
            {manager.nation}
            {manager.clubBadge}
          </span>
        </div>

        <div className="mb-2 grid h-20 w-full place-items-center overflow-hidden rounded-2xl bg-secondary/40">
          <ClipboardList className="h-9 w-9 text-muted-foreground transition-transform duration-200 group-hover:-translate-y-0.5" />
        </div>

        <h3 className="truncate text-sm font-bold uppercase tracking-wide">{manager.name}</h3>
        <p className="mb-2 truncate text-[11px] text-muted-foreground">{manager.club}</p>

        <dl className="space-y-1 text-[11px]">
          <div className="flex items-center gap-1.5 rounded-lg bg-secondary/40 px-2 py-1">
            <Percent className="h-3.5 w-3.5 shrink-0 text-primary" />
            <dt className="min-w-0 flex-1 truncate text-muted-foreground">{t("winRate")}</dt>
            <dd className="shrink-0 font-bold">{manager.winRate}%</dd>
          </div>
          <div className="flex items-center gap-1.5 rounded-lg bg-secondary/40 px-2 py-1">
            <ClipboardList className="h-3.5 w-3.5 shrink-0 text-accent" />
            <dt className="min-w-0 flex-1 truncate text-muted-foreground">{t("tacticalStyle")}</dt>
            <dd className="shrink-0 truncate font-bold">{manager.style}</dd>
          </div>
          <div className="flex items-center gap-1.5 rounded-lg bg-secondary/40 px-2 py-1">
            <LayoutGrid className="h-3.5 w-3.5 shrink-0 text-primary" />
            <dt className="min-w-0 flex-1 truncate text-muted-foreground">{t("formation")}</dt>
            <dd className="shrink-0 font-bold">{manager.formation}</dd>
          </div>
        </dl>
      </div>
    </button>
  );
}
