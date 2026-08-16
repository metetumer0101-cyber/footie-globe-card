import { useTranslation } from "react-i18next";
import { Shirt } from "lucide-react";
import { tierStyles, type PlayerCardData } from "@/data/football";
import { cn } from "@/lib/utils";

export function PlayerFrontCard({
  player,
  onClick,
}: {
  player: PlayerCardData;
  onClick?: () => void;
}) {
  const { t } = useTranslation();
  const tier = tierStyles[player.tier];
  const core = [
    ["pac", player.core.pac],
    ["sho", player.core.sho],
    ["pas", player.core.pas],
    ["dri", player.core.dri],
    ["def", player.core.def],
    ["phy", player.core.phy],
  ] as const;

  return (
    <button
      onClick={onClick}
      aria-label={`${player.name} — ${t("tapForDetails")}`}
      className={cn(
        "group w-44 shrink-0 snap-start rounded-3xl bg-gradient-to-b p-[2px] text-start transition-transform duration-200 hover:scale-[1.03] active:scale-[0.98]",
        tier.frame,
        tier.glow,
      )}
    >
      <div className="flex h-full flex-col rounded-[22px] bg-surface p-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <span
            className={cn(
              "rounded-lg px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wide",
              tier.chip,
            )}
          >
            {t(player.tier)}
          </span>
          <span className="rounded-lg bg-secondary/60 px-1.5 py-0.5 text-[10px] font-bold">
            {player.position}
          </span>
        </div>

        <div className="relative mb-2 grid h-24 w-full place-items-center overflow-hidden rounded-2xl bg-secondary/40">
          <div
            className={cn(
              "absolute inset-x-0 -bottom-6 h-20 rounded-full bg-gradient-to-b opacity-30 blur-xl",
              tier.frame,
            )}
          />
          <Shirt className="relative h-11 w-11 text-muted-foreground transition-transform duration-200 group-hover:-translate-y-0.5" />
          <span className="absolute bottom-1 start-1.5 text-base leading-none">{player.nation}</span>
          <span className="absolute bottom-1 end-1.5 text-base leading-none">{player.clubBadge}</span>
        </div>

        <h3 className="truncate text-sm font-bold uppercase tracking-wide">{player.name}</h3>
        <p className="mb-2 truncate text-[11px] text-muted-foreground">{player.club}</p>

        <dl className="grid grid-cols-3 gap-1">
          {core.map(([key, value]) => (
            <div key={key} className="rounded-lg bg-secondary/40 px-1 py-1 text-center">
              <dt className="text-[9px] font-semibold text-muted-foreground">
                {t(`attr.${key}`)}
              </dt>
              <dd className="text-xs font-bold">{value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </button>
  );
}
