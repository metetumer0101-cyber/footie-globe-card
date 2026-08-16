import { useTranslation } from "react-i18next";
import {
  Activity,
  CalendarClock,
  Footprints,
  Map,
  Ruler,
  TrendingUp,
  Trophy,
  Weight,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RadarChart } from "./RadarChart";
import { AttributeList } from "./AttributeList";
import { tierStyles, type CardData } from "@/data/football";
import { cn } from "@/lib/utils";

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Ruler;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2 rounded-xl bg-secondary/40 px-2.5 py-2">
      <Icon className="h-4 w-4 shrink-0 text-primary" />
      <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">{label}</span>
      <span className="shrink-0 truncate text-xs font-bold">{value}</span>
    </div>
  );
}

export function CardDetailModal({
  card,
  onOpenChange,
}: {
  card: CardData | null;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useTranslation();
  if (!card) return null;
  const tier = tierStyles[card.tier];

  return (
    <Dialog open={!!card} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] max-w-lg overflow-y-auto border-border bg-surface p-4">
        <DialogHeader className="text-start">
          <div className="flex items-center gap-3">
            <span
              className={cn(
                "grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br text-xl",
                tier.frame,
              )}
            >
              {card.nation}
            </span>
            <div className="min-w-0">
              <DialogTitle className="truncate text-lg">{card.name}</DialogTitle>
              <DialogDescription className="truncate text-xs">
                {card.clubBadge} {card.club} ·{" "}
                {card.type === "player" ? card.position : t("manager")} · {t(card.tier)}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {card.type === "player" ? (
          <>
            <div className="card-surface rounded-2xl py-2">
              <RadarChart core={card.core} />
            </div>

            <section className="mt-4">
              <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-accent">
                {t("information")}
              </h3>
              <div className="grid gap-1.5 sm:grid-cols-2">
                <InfoRow icon={CalendarClock} label={t("age")} value={String(card.age)} />
                <InfoRow icon={Ruler} label={t("height")} value={`${card.heightCm} cm`} />
                <InfoRow icon={Weight} label={t("weight")} value={`${card.weightKg} kg`} />
                <InfoRow icon={Footprints} label={t("preferredFoot")} value={t(card.foot)} />
                <InfoRow icon={TrendingUp} label={t("marketValue")} value={card.marketValue} />
                <InfoRow
                  icon={CalendarClock}
                  label={t("contractUntil")}
                  value={card.contractUntil}
                />
                <InfoRow
                  icon={Activity}
                  label={t("injuryHistory")}
                  value={card.injuries ?? t("noInjuries")}
                />
              </div>
            </section>

            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <div className="flex h-24 flex-col justify-between rounded-2xl border border-dashed border-border bg-secondary/30 p-3">
                <span className="flex items-center gap-1.5 text-xs font-semibold">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  {t("valueTrend")}
                </span>
                <span className="text-[11px] text-muted-foreground">{t("chartPlaceholder")}</span>
              </div>
              <div className="flex h-24 flex-col justify-between rounded-2xl border border-dashed border-border bg-secondary/30 p-3">
                <span className="flex items-center gap-1.5 text-xs font-semibold">
                  <Map className="h-4 w-4 text-accent" />
                  {t("heatmap")}
                </span>
                <span className="text-[11px] text-muted-foreground">{t("chartPlaceholder")}</span>
              </div>
            </div>

            <AttributeList titleKey="technical" attrs={card.technical} />
            <AttributeList titleKey="physicalCat" attrs={card.physical} />
            <AttributeList titleKey="mental" attrs={card.mental} />
          </>
        ) : (
          <section className="mt-2 grid gap-1.5 sm:grid-cols-2">
            <InfoRow icon={TrendingUp} label={t("winRate")} value={`${card.winRate}%`} />
            <InfoRow icon={Activity} label={t("tacticalStyle")} value={card.style} />
            <InfoRow icon={Map} label={t("formation")} value={card.formation} />
            <InfoRow icon={CalendarClock} label={t("age")} value={String(card.age)} />
            <InfoRow icon={TrendingUp} label={t("marketValue")} value={card.marketValue} />
            <InfoRow icon={CalendarClock} label={t("contractUntil")} value={card.contractUntil} />
            <InfoRow icon={Trophy} label="Trophies" value={String(card.trophies)} />
          </section>
        )}
      </DialogContent>
    </Dialog>
  );
}
