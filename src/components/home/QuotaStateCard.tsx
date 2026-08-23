import { useTranslation } from "react-i18next";
import { RefreshCw, WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Elegant, honest empty-state card shown when live data is unavailable because
 * the daily API quota is exhausted (or the system is mid-refresh). It never
 * fabricates data — it simply tells the user what is happening and that fresh
 * data returns automatically after midnight (UTC).
 */
export function QuotaStateCard({ className }: { className?: string }) {
  const { t } = useTranslation();
  return (
    <section
      role="status"
      aria-label={t("status.quotaAria", { defaultValue: "Live data is temporarily unavailable" })}
      className={cn(
        "card-surface relative overflow-hidden rounded-3xl border border-dashed p-6 text-center",
        className,
      )}
    >
      <div className="absolute -end-8 -top-8 h-28 w-28 rounded-full bg-primary/10 blur-2xl" />
      <div className="relative mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-secondary/60">
        <WifiOff className="h-6 w-6 text-muted-foreground" />
      </div>
      <h3 className="relative mt-3 text-base font-extrabold">
        {t("status.updatingTitle", { defaultValue: "System updating" })}
      </h3>
      <p className="relative mx-auto mt-1 max-w-md text-sm text-muted-foreground">
        {t("status.quotaSubtitle", {
          defaultValue:
            "Today's live data quota is used up. Fresh scores will return automatically after midnight (UTC).",
        })}
      </p>
      <p className="relative mt-3 inline-flex items-center gap-1.5 rounded-full bg-secondary/50 px-3 py-1 text-[11px] font-semibold text-muted-foreground">
        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
        {t("status.autoResume", { defaultValue: "Auto-resumes after midnight UTC" })}
      </p>
    </section>
  );
}
