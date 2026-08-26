import { Plus, User } from "lucide-react";
import { useTranslation } from "react-i18next";
import { tierStyles, type PlayerCardData } from "@/data/football";
import { playerById, shortName } from "@/lib/squad";
import { getPlayerDisplayName } from "@/lib/player-name";
import { cn } from "@/lib/utils";

export const chemColor = (v: number) =>
  v >= 75 ? "text-primary" : v >= 45 ? "text-accent" : "text-destructive";

export function SlotChip({
  slotId,
  role,
  playerId,
  extras,
  chem,
  compact,
  onClick,
  onDragStart,
}: {
  slotId: string;
  role: string;
  playerId: string | null;
  extras?: Record<string, PlayerCardData> | undefined;
  chem?: number | undefined;
  compact?: boolean;
  onClick: () => void;
  onDragStart?: (slotId: string, e: React.PointerEvent) => void;
}) {
  const { t } = useTranslation();
  const player = playerById(playerId, extras);
  const tier = player ? tierStyles[player.tier] : null;

  return (
    <button
      type="button"
      data-slot={slotId}
      onClick={onClick}
      onPointerDown={(e) => {
        if (player && onDragStart) onDragStart(slotId, e);
      }}
      className={cn(
        "group flex touch-none select-none flex-col items-center gap-1 outline-none",
        compact ? "w-[68px]" : "w-[74px]",
      )}
    >
      <span
        className={cn(
          "relative flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-b p-[2px] transition-transform group-active:scale-95",
          player && tier ? cn(tier.frame, tier.glow) : "from-white/20 to-white/5",
        )}
      >
        <span className="flex h-full w-full items-center justify-center overflow-hidden rounded-[14px] bg-background/85 text-lg">
          {player ? (
            player.photo ? (
              <img
                src={player.photo}
                alt={player.name}
                loading="lazy"
                className="h-full w-full object-cover"
              />
            ) : (
              player.nation
            )
          ) : (
            <Plus className="h-4 w-4 text-muted-foreground" />
          )}
        </span>
        {player && typeof chem === "number" && (
          <span
            className={cn(
              "absolute -bottom-1 -right-1 rounded-full bg-background px-1 text-[9px] font-black leading-tight",
              chemColor(chem),
            )}
          >
            {chem}
          </span>
        )}
      </span>
      <span className="max-w-full truncate rounded-md bg-background/70 px-1 text-[10px] font-bold leading-tight">
        {player ? shortName(getPlayerDisplayName(player)) : t("sq.empty")}
      </span>
      <span className="rounded bg-primary/20 px-1 text-[9px] font-black uppercase text-primary">
        {role}
      </span>
    </button>
  );
}

export function ManagerSlot({ managerName, onClick }: { managerName: string | null; onClick: () => void }) {
  const { t } = useTranslation();
  return (
    <button
      type="button"
      onClick={onClick}
      className="card-surface flex w-full items-center gap-3 rounded-2xl p-3 text-start transition-transform active:scale-[0.99]"
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/15 text-accent">
        <User className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
          {t("sq.manager")}
        </span>
        <span className="block truncate text-sm font-bold">{managerName ?? t("sq.selectManager")}</span>
      </span>
    </button>
  );
}
