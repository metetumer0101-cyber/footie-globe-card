import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { ChevronRight } from "lucide-react";

export function SectionRow({
  titleKey,
  children,
}: {
  titleKey: string;
  children: ReactNode;
}) {
  const { t } = useTranslation();
  return (
    <section className="mt-7">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="min-w-0 truncate text-base font-bold">{t(titleKey)}</h2>
        <button className="flex shrink-0 items-center gap-0.5 text-xs font-medium text-primary">
          {t("seeAll")}
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="no-scrollbar -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-1">
        {children}
      </div>
    </section>
  );
}
