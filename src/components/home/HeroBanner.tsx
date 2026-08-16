import { useTranslation } from "react-i18next";
import { ChevronRight, Sparkles } from "lucide-react";
import { players } from "@/data/football";

export function HeroBanner({ onOpen }: { onOpen?: () => void }) {
  const { t } = useTranslation();
  const p = players.find((x) => x.id === "arda") ?? players[0]!;
  const core = [
    ["pac", p.core.pac],
    ["sho", p.core.sho],
    ["pas", p.core.pas],
    ["dri", p.core.dri],
    ["def", p.core.def],
    ["phy", p.core.phy],
  ] as const;

  return (
    <section className="card-surface glow relative overflow-hidden rounded-3xl p-4">
      <div className="absolute -end-10 -top-10 h-32 w-32 rounded-full gradient-pitch opacity-25 blur-2xl" />
      <div className="relative flex items-center gap-2 text-xs font-semibold text-accent">
        <Sparkles className="h-4 w-4" />
        <span className="truncate uppercase tracking-wide">{t("playerOfTheDay")}</span>
      </div>

      <div className="relative mt-3 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
        <div className="min-w-0">
          <h2 className="truncate text-2xl font-extrabold">{p.name}</h2>
          <p className="truncate text-sm text-muted-foreground">
            {p.nation} {p.club} · {p.position} · {t(p.tier)}
          </p>
        </div>
        <button
          onClick={onOpen}
          className="flex shrink-0 items-center gap-1 rounded-full gradient-pitch px-3 py-2 text-xs font-bold text-primary-foreground transition-transform duration-200 hover:scale-105"
        >
          {t("seeAll")}
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>

      <dl className="relative mt-4 grid grid-cols-3 gap-2">
        {core.map(([key, value]) => (
          <div key={key} className="rounded-xl bg-secondary/50 px-2 py-2">
            <dt className="truncate text-[10px] uppercase tracking-wide text-muted-foreground">
              {t(`attr.${key}`)}
            </dt>
            <dd className="text-sm font-bold text-primary">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
