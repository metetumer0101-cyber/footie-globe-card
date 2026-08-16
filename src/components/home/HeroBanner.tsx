import { useTranslation } from "react-i18next";
import { Sparkles } from "lucide-react";
import { playerOfTheDay } from "./data";

export function HeroBanner() {
  const { t } = useTranslation();
  const p = playerOfTheDay;

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
            {p.country} {p.club} · {p.position} · {p.age}
          </p>
        </div>
        <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl gradient-pitch">
          <span className="text-xl font-black text-primary-foreground">{p.rating}</span>
        </div>
      </div>

      <dl className="relative mt-4 grid grid-cols-3 gap-2">
        {p.stats.map((s) => (
          <div key={s.key} className="rounded-xl bg-secondary/50 px-2 py-2">
            <dt className="truncate text-[10px] uppercase tracking-wide text-muted-foreground">
              {t(s.key)}
            </dt>
            <dd className="text-sm font-bold text-primary">{s.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
