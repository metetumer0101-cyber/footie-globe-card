import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Lightbulb } from "lucide-react";
import { players } from "@/data/football";
import { TP_PENALTY, randomTransferPath, transferPathXp, type TransferPath } from "@/lib/games";

export function TransferPathGame({ onAward }: { onAward: (xp: number) => void }) {
  const { t } = useTranslation();
  const [path, setPath] = useState<TransferPath>(() => randomTransferPath());
  const [hints, setHints] = useState(0);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"playing" | "won" | "lost">("playing");
  const [gained, setGained] = useState(0);

  const target = players.find((p) => p.id === path.playerId)!;
  const shown = 1 + hints;

  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return players.filter((p) => p.name.toLowerCase().includes(q)).slice(0, 5);
  }, [query]);

  const guess = (id: string) => {
    if (status !== "playing") return;
    setQuery("");
    if (id === target.id) {
      const xp = transferPathXp(hints);
      setGained(xp);
      setStatus("won");
      onAward(xp);
    } else {
      setGained(TP_PENALTY);
      setStatus("lost");
      onAward(TP_PENALTY);
    }
  };

  const reset = () => {
    setPath(randomTransferPath(path.playerId));
    setHints(0);
    setStatus("playing");
    setQuery("");
    setGained(0);
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{t("games.tp.subtitle")}</p>

      <ol className="space-y-2">
        {path.clubs.map((club, i) => (
          <li
            key={`${club}-${i}`}
            className={`flex items-center gap-3 rounded-2xl border px-3 py-2.5 text-sm ${
              i < shown || status !== "playing"
                ? "border-primary/30 bg-primary/10 font-semibold"
                : "border-border bg-secondary/40 text-muted-foreground"
            }`}
          >
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-background text-xs font-bold">
              {i + 1}
            </span>
            {i < shown || status !== "playing" ? club : "???"}
          </li>
        ))}
      </ol>

      {status === "playing" ? (
        <>
          <div className="flex items-center justify-between gap-2">
            <button
              onClick={() => setHints((h) => Math.min(h + 1, path.clubs.length - 1))}
              disabled={shown >= path.clubs.length}
              className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary/60 px-3 py-2 text-xs font-semibold disabled:opacity-40"
            >
              <Lightbulb className="h-4 w-4 text-accent" /> {t("games.tp.hint")} (−30 XP)
            </button>
            <span className="text-xs font-bold text-primary">
              {t("games.tp.reward")}: {transferPathXp(hints)} XP
            </span>
          </div>

          <div className="relative">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("games.tp.guessPlaceholder")}
              className="w-full rounded-2xl border border-border bg-surface px-4 py-3 text-sm outline-none focus:border-primary"
            />
            {suggestions.length > 0 && (
              <ul className="absolute z-20 mt-2 w-full overflow-hidden rounded-2xl border border-border bg-card shadow-xl">
                {suggestions.map((p) => (
                  <li key={p.id}>
                    <button
                      onClick={() => guess(p.id)}
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
        </>
      ) : (
        <div className="space-y-3 text-center">
          <p className={`text-sm font-bold ${status === "won" ? "text-primary" : "text-destructive"}`}>
            {status === "won" ? t("games.correct") : `${t("games.wrong")} — ${target.name}`} · {gained > 0 ? "+" : ""}
            {gained} XP
          </p>
          <button
            onClick={reset}
            className="w-full rounded-2xl bg-accent px-4 py-3 font-bold text-background transition-transform active:scale-95"
          >
            {t("games.next")}
          </button>
        </div>
      )}
    </div>
  );
}
