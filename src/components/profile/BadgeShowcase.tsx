import { useTranslation } from "react-i18next";
import { Lock } from "lucide-react";
import { badges, isUnlocked, type BadgeStats } from "@/lib/badges";

export function BadgeShowcase({ stats }: { stats: BadgeStats }) {
  const { t } = useTranslation();
  const unlocked = badges.filter((b) => isUnlocked(b, stats)).length;

  return (
    <section className="card-surface rounded-3xl p-4">
      <header className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
          {t("badges.title", { defaultValue: "Badge Collection" })}
        </h2>
        <span className="text-xs font-bold text-accent">
          {unlocked}/{badges.length}
        </span>
      </header>
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {badges.map((badge) => {
          const pct = Math.round(badge.progress(stats) * 100);
          const done = pct >= 100;
          const Icon = badge.icon;
          return (
            <li
              key={badge.key}
              className={`rounded-2xl border p-3 text-center transition-colors ${
                done ? "border-primary/50 bg-primary/10" : "border-border bg-secondary/40"
              }`}
            >
              <span
                className={`mx-auto grid h-10 w-10 place-items-center rounded-full ${
                  done ? "gradient-pitch text-background" : "bg-secondary text-muted-foreground"
                }`}
              >
                {done ? <Icon className="h-5 w-5" /> : <Lock className="h-4 w-4" />}
              </span>
              <p className="mt-2 text-xs font-bold leading-tight">
                {t(`badges.${badge.key}.title`, { defaultValue: badge.title })}
              </p>
              <p className="mt-0.5 text-[10px] leading-tight text-muted-foreground">
                {t(`badges.${badge.key}.hint`, { defaultValue: badge.hint })}
              </p>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-secondary">
                <div
                  className={`h-full rounded-full ${done ? "gradient-pitch" : "bg-accent/70"}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
