import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowDown, ArrowUp } from "lucide-react";
import { players } from "@/data/football";
import {
  DAILY_MAX_GUESSES,
  DAILY_PENALTY,
  clueClass,
  compareDaily,
  dailyPlayer,
  dailyXp,
  type DailyFeedback,
} from "@/lib/games";

export function DailyPlayerGame({ onAward }: { onAward: (xp: number) => void }) {
  const { t } = useTranslation();
  const target = useMemo(() => dailyPlayer(), []);
  const [rows, setRows] = useState<DailyFeedback[]>([]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"playing" | "won" | "lost">("playing");
  const [gained, setGained] = useState(0);

  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const used = new Set(rows.map((r) => r.guess.id));
    return players.filter((p) => !used.has(p.id) && p.name.toLowerCase().includes(q)).slice(0, 5);
  }, [query, rows]);

  const submit = (id: string) => {
    if (status !== "playing") return;
    const guess = players.find((p) => p.id === id)!;
    const feedback = compareDaily(guess, target);
    const nextRows = [...rows, feedback];
    setRows(nextRows);
    setQuery("");

    if (guess.id === target.id) {
      const xp = dailyXp(nextRows.length);
      setGained(xp);
      setStatus("won");
      onAward(xp);
    } else if (nextRows.length >= DAILY_MAX_GUESSES) {
      setGained(DAILY_PENALTY);
      setStatus("lost");
      onAward(DAILY_PENALTY);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {t("games.daily.subtitle", { max: DAILY_MAX_GUESSES })} · {t("games.daily.left")}:{" "}
        {DAILY_MAX_GUESSES - rows.length}
      </p>

      <div className="grid grid-cols-[1.6fr_1.4fr_0.8fr_0.8fr] gap-1.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
        <span>{t("games.daily.player")}</span>
        <span>{t("games.daily.club")}</span>
        <span>{t("games.daily.pos")}</span>
        <span>{t("games.daily.age")}</span>
      </div>

      <div className="space-y-1.5">
        {rows.map((r) => (
          <div key={r.guess.id} className="grid grid-cols-[1.6fr_1.4fr_0.8fr_0.8fr] gap-1.5 text-xs">
            <span className={`truncate rounded-lg border px-2 py-2 font-semibold ${clueClass[r.nation]}`}>
              {r.guess.nation} {r.guess.name}
            </span>
            <span className={`truncate rounded-lg border px-2 py-2 ${clueClass[r.club]}`}>{r.guess.club}</span>
            <span className={`rounded-lg border px-2 py-2 text-center ${clueClass[r.position]}`}>
              {r.guess.position}
            </span>
            <span
              className={`inline-flex items-center justify-center gap-0.5 rounded-lg border px-2 py-2 ${clueClass[r.age]}`}
            >
              {r.guess.age}
              {r.ageHint === "up" && <ArrowUp className="h-3 w-3" />}
              {r.ageHint === "down" && <ArrowDown className="h-3 w-3" />}
            </span>
          </div>
        ))}
      </div>

      {status === "playing" ? (
        <div className="relative">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("games.daily.guessPlaceholder")}
            className="w-full rounded-2xl border border-border bg-surface px-4 py-3 text-sm outline-none focus:border-primary"
          />
          {suggestions.length > 0 && (
            <ul className="absolute z-20 mt-2 w-full overflow-hidden rounded-2xl border border-border bg-card shadow-xl">
              {suggestions.map((p) => (
                <li key={p.id}>
                  <button
                    onClick={() => submit(p.id)}
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-start text-sm hover:bg-secondary/60"
                  >
                    <span>{p.nation}</span>
                    <span className="truncate">{p.name}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <p className={`text-center text-sm font-bold ${status === "won" ? "text-primary" : "text-destructive"}`}>
          {status === "won" ? t("games.correct") : `${t("games.wrong")} — ${target.name}`} · {gained > 0 ? "+" : ""}
          {gained} XP
        </p>
      )}
    </div>
  );
}
