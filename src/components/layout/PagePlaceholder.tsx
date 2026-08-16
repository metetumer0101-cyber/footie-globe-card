import { useTranslation } from "react-i18next";
import type { LucideIcon } from "lucide-react";

export function PagePlaceholder({
  titleKey,
  icon: Icon,
  description,
}: {
  titleKey: string;
  icon: LucideIcon;
  description?: string;
}) {
  const { t } = useTranslation();
  return (
    <section className="card-surface flex min-h-[60vh] flex-col items-center justify-center gap-3 rounded-3xl p-8 text-center">
      <span className="grid h-16 w-16 place-items-center rounded-2xl gradient-pitch">
        <Icon className="h-7 w-7 text-primary-foreground" />
      </span>
      <h1 className="text-2xl font-bold">{t(titleKey)}</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        {description ?? t("comingSoon")}
      </p>
    </section>
  );
}
