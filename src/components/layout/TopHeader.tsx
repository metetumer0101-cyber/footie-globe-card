import { useTranslation } from "react-i18next";
import { Bell, Search, UserRound } from "lucide-react";
import { LanguageSelector } from "./LanguageSelector";

export function TopHeader() {
  const { t } = useTranslation();
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur">
      <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-3">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl gradient-pitch text-lg md:hidden">
              ⚽
            </span>
            <h1 className="truncate text-xl font-extrabold tracking-tight">
              Foot<span className="text-primary">Card</span>
            </h1>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <LanguageSelector />
            <button
              aria-label={t("notifications")}
              className="relative grid h-10 w-10 place-items-center rounded-full border border-border bg-secondary/60 transition-colors hover:bg-secondary"
            >
              <Bell className="h-4.5 w-4.5" />
              <span className="absolute end-2.5 top-2.5 h-2 w-2 rounded-full bg-accent" />
            </button>
            <button
              aria-label={t("nav.profile")}
              className="grid h-10 w-10 place-items-center rounded-full border border-border bg-secondary/60 transition-colors hover:bg-secondary"
            >
              <UserRound className="h-4.5 w-4.5" />
            </button>
          </div>
        </div>
        <label className="flex items-center gap-2 rounded-2xl border border-border bg-surface px-3 py-2.5">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            placeholder={t("searchPlaceholder")}
          />
        </label>
      </div>
    </header>
  );
}
