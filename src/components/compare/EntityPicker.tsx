import { useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Search, X } from "lucide-react";
import { subtitleOf, type Entity } from "@/lib/compare";
import { cn } from "@/lib/utils";

export function EntityPicker({
  label,
  pool,
  value,
  onChange,
  side,
}: {
  label: string;
  pool: Entity[];
  value: Entity;
  onChange: (id: string) => void;
  side: "a" | "b";
}) {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return pool;
    return pool.filter(
      (e) => e.name.toLowerCase().includes(q) || e.club.toLowerCase().includes(q),
    );
  }, [pool, query]);

  return (
    <div className="relative min-w-0">
      <p
        className={cn(
          "mb-1 text-[10px] font-black uppercase tracking-wide",
          side === "a" ? "text-primary" : "text-accent",
        )}
      >
        {label}
      </p>
      <div className="card-surface flex items-center gap-2 rounded-2xl px-3 py-2">
        <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
        <input
          value={open ? query : value.name}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            setQuery("");
            setOpen(true);
          }}
          onBlur={() => {
            blurTimer.current = setTimeout(() => setOpen(false), 120);
          }}
          aria-label={`${label} — ${t("cmp.search")}`}
          placeholder={t("cmp.search")}
          className="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none placeholder:text-muted-foreground"
        />
        {open && query && (
          <button
            type="button"
            aria-label={t("close")}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setQuery("")}
            className="shrink-0 text-muted-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {open && (
        <ul className="card-surface absolute z-30 mt-1 max-h-60 w-full overflow-y-auto rounded-2xl p-1 shadow-xl">
          {results.length === 0 && (
            <li className="px-3 py-2 text-xs text-muted-foreground">{t("cmp.noMatch")}</li>
          )}
          {results.map((e) => (
            <li key={e.id}>
              <button
                type="button"
                onMouseDown={(ev) => ev.preventDefault()}
                onClick={() => {
                  if (blurTimer.current) clearTimeout(blurTimer.current);
                  onChange(e.id);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center gap-2 rounded-xl px-2 py-2 text-start transition-colors hover:bg-secondary/60",
                  e.id === value.id && "bg-secondary/50",
                )}
              >
                <span className="shrink-0 text-lg">{e.nation}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-bold">{e.name}</span>
                  <span className="block truncate text-[10px] text-muted-foreground">
                    {subtitleOf(e)}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
