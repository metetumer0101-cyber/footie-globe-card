import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Gamepad2, Search, Swords, X } from "lucide-react";
import { cn } from "@/lib/utils";
import brandIcon from "@/assets/footcard-icon.png";

const KEY = "footcard:onboarded";

const SLIDES = [
  { icon: Search, titleKey: "onboarding.s1t", bodyKey: "onboarding.s1b" },
  { icon: Swords, titleKey: "onboarding.s2t", bodyKey: "onboarding.s2b" },
  { icon: Gamepad2, titleKey: "onboarding.s3t", bodyKey: "onboarding.s3b" },
] as const;

/** First-visit intro; shown once, flagged in localStorage. */
export function OnboardingDialog() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    try {
      if (!window.localStorage.getItem(KEY)) setOpen(true);
    } catch {
      /* ignore */
    }
  }, []);

  const close = () => {
    try {
      window.localStorage.setItem(KEY, "1");
    } catch {
      /* ignore */
    }
    setOpen(false);
  };

  if (!open) return null;
  const slide = SLIDES[step] ?? SLIDES[0];
  const Icon = slide.icon;
  const last = step === SLIDES.length - 1;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t(slide.titleKey)}
      className="fixed inset-0 z-50 grid place-items-center bg-background/80 p-4 backdrop-blur-sm"
    >
      <div className="card-surface w-full max-w-sm rounded-3xl p-6 text-center shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <img src={brandIcon} alt="" className="h-8 w-8 rounded-lg" />
          <button
            onClick={close}
            aria-label={t("onboarding.skip")}
            className="grid h-8 w-8 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-primary/15 text-primary">
          <Icon className="h-8 w-8" />
        </span>
        <h2 className="mt-4 text-lg font-extrabold">{t(slide.titleKey)}</h2>
        <p className="mt-1.5 text-sm text-muted-foreground">{t(slide.bodyKey)}</p>
        <div className="mt-4 flex items-center justify-center gap-1.5">
          {SLIDES.map((s, i) => (
            <span
              key={s.titleKey}
              className={cn(
                "h-1.5 rounded-full transition-all",
                i === step ? "w-5 bg-primary" : "w-1.5 bg-secondary",
              )}
            />
          ))}
        </div>
        <div className="mt-5 flex gap-2">
          {last ? (
            <button
              onClick={close}
              className="w-full rounded-2xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground"
            >
              {t("onboarding.start")}
            </button>
          ) : (
            <>
              <button
                onClick={close}
                className="flex-1 rounded-2xl border border-border bg-secondary/60 px-4 py-2.5 text-sm font-bold"
              >
                {t("onboarding.skip")}
              </button>
              <button
                onClick={() => setStep((s) => Math.min(SLIDES.length - 1, s + 1))}
                className="flex-1 rounded-2xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground"
              >
                {t("onboarding.next")}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
