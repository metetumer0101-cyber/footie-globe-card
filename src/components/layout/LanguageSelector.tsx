import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Check, Globe, Search } from "lucide-react";
import { languages, STORAGE_KEY } from "@/i18n";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export function LanguageSelector() {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const fallback = { code: "en", native: "English", english: "English", flag: "\u{1F1EC}\u{1F1E7}", rtl: false };
  const current =
    languages.find((l) => l.code === i18n.resolvedLanguage) ??
    languages.find((l) => l.code === i18n.language?.split("-")[0]) ??
    languages[0] ??
    fallback;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return languages;
    return languages.filter(
      (l) =>
        l.native.toLowerCase().includes(q) ||
        l.english.toLowerCase().includes(q) ||
        l.code.toLowerCase().includes(q),
    );
  }, [query]);

  const select = (code: string) => {
    void i18n.changeLanguage(code);
    if (typeof window !== "undefined") window.localStorage.setItem(STORAGE_KEY, code);
    const meta = languages.find((l) => l.code === code);
    if (typeof document !== "undefined") {
      document.documentElement.lang = code;
      document.documentElement.dir = meta?.rtl ? "rtl" : "ltr";
    }
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        aria-label={t("language")}
        className="flex h-10 items-center gap-1.5 rounded-full border border-border bg-secondary/60 px-3 text-sm font-medium transition-colors hover:bg-secondary"
      >
        <span className="text-base leading-none">{current.flag}</span>
        <span className="hidden sm:inline">{current.code.toUpperCase()}</span>
        <Globe className="h-4 w-4 text-muted-foreground sm:hidden" />
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 p-0">
        <div className="flex items-center gap-2 border-b border-border px-3 py-2">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("searchLanguage")}
            className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
        <ul className="no-scrollbar max-h-72 overflow-y-auto py-1">
          {filtered.map((l) => (
            <li key={l.code}>
              <button
                onClick={() => select(l.code)}
                className="flex w-full items-center gap-2.5 px-3 py-2 text-start text-sm transition-colors hover:bg-secondary"
              >
                <span className="text-base leading-none">{l.flag}</span>
                <span className="min-w-0 flex-1 truncate">{l.native}</span>
                <span className="shrink-0 text-xs text-muted-foreground">{l.english}</span>
                {l.code === current.code && (
                  <Check className="h-4 w-4 shrink-0 text-primary" />
                )}
              </button>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
