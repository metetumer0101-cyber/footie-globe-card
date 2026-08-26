import { useTranslation } from "react-i18next";
import { Shirt } from "lucide-react";
import { tierStyles, type PlayerCardData } from "@/data/football";
import { getPlayerDisplayName } from "@/lib/player-name";
import { cn } from "@/lib/utils";

const dash = (v?: number | null) =>
  v == null || !Number.isFinite(v) ? "—" : String(v);

/**
 * "Identity card" — a real, data-backed player card. Shows only verified bio
 * (photo, name, age, country/flag, position, club, height/weight, league) and
 * real season stats when present. No fabricated technical/physical/mental
 * attributes and no derived "core" grade.
 */
export function PlayerFrontCard({
  player,
  onClick,
}: {
  player: PlayerCardData;
  onClick?: () => void;
}) {
  const { t } = useTranslation();
  const tier = tierStyles[player.tier];
  const position = player.positionName || player.position;
  const flag = player.flag || player.nation;

  return (
    <button
      onClick={onClick}
      aria-label={`${getPlayerDisplayName(player)} — ${t("tapForDetails")}`}
      className={cn(
        "group w-44 shrink-0 snap-start rounded-3xl bg-gradient-to-b p-[2px] text-start transition-transform duration-200 hover:scale-[1.03] active:scale-[0.98]",
        tier.frame,
        tier.glow,
      )}
    >
      <div className="flex h-full flex-col rounded-[22px] bg-surface p-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <span className="rounded-lg bg-secondary/60 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide">
            {position}
          </span>
          <span className="rounded-lg bg-secondary/60 px-1.5 py-0.5 text-[10px] font-bold">
            {player.age > 0 ? `${player.age} ` : ""}
            {player.age > 0 ? t("age").toLowerCase() : ""}
          </span>
        </div>

        <div className="relative mb-2 grid h-24 w-full place-items-center overflow-hidden rounded-2xl bg-secondary/40">
          <div
            className={cn(
              "absolute inset-x-0 -bottom-6 h-20 rounded-full bg-gradient-to-b opacity-30 blur-xl",
              tier.frame,
            )}
          />
          {player.photo ? (
            <img
              src={player.photo}
              alt={getPlayerDisplayName(player)}
              loading="lazy"
              className="relative h-20 w-20 rounded-full object-cover ring-2 ring-border/60 transition-transform duration-200 group-hover:-translate-y-0.5"
            />
          ) : (
            <Shirt className="relative h-11 w-11 text-muted-foreground transition-transform duration-200 group-hover:-translate-y-0.5" />
          )}
          {flag ? (
            flag.startsWith("http") ? (
              <img
                src={flag}
                alt=""
                loading="lazy"
                className="absolute bottom-1 start-1.5 h-4 w-6 rounded-[3px] object-cover ring-1 ring-border/60"
              />
            ) : (
              <span className="absolute bottom-1 start-1.5 text-base leading-none">{flag}</span>
            )
          ) : null}
        </div>

        <h3 className="truncate text-sm font-bold uppercase tracking-wide">{getPlayerDisplayName(player)}</h3>
        <p className="mb-2 truncate text-[11px] text-muted-foreground">
          {player.club}
          {player.league ? ` · ${player.league}` : ""}
        </p>

        <dl className="grid grid-cols-3 gap-1">
          <div className="rounded-lg bg-secondary/40 px-1 py-1 text-center">
            <dt className="text-[9px] font-semibold text-muted-foreground">{t("age")}</dt>
            <dd className="text-xs font-bold">{dash(player.age)}</dd>
          </div>
          <div className="rounded-lg bg-secondary/40 px-1 py-1 text-center">
            <dt className="text-[9px] font-semibold text-muted-foreground">cm</dt>
            <dd className="text-xs font-bold">{dash(player.heightCm)}</dd>
          </div>
          <div className="rounded-lg bg-secondary/40 px-1 py-1 text-center">
            <dt className="text-[9px] font-semibold text-muted-foreground">kg</dt>
            <dd className="text-xs font-bold">{dash(player.weightKg)}</dd>
          </div>
        </dl>
      </div>
    </button>
  );
}
