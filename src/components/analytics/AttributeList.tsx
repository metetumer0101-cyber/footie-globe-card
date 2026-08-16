import { useTranslation } from "react-i18next";
import type { DeepAttr } from "@/data/football";

export function AttributeList({ titleKey, attrs }: { titleKey: string; attrs: DeepAttr[] }) {
  const { t } = useTranslation();
  return (
    <section className="mt-4">
      <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-accent">{t(titleKey)}</h3>
      <ul className="grid gap-1.5 sm:grid-cols-2">
        {attrs.map((a) => (
          <li key={a.key} className="flex items-center gap-2 rounded-lg bg-secondary/40 px-2.5 py-1.5">
            <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
              {t(`deep.${a.key}`)}
            </span>
            <span className="h-1.5 w-16 shrink-0 overflow-hidden rounded-full bg-background">
              <span
                className="block h-full rounded-full bg-primary"
                style={{ width: `${a.value}%` }}
              />
            </span>
            <span className="w-6 shrink-0 text-end text-xs font-bold">{a.value}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
