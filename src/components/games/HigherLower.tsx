import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown, ChevronUp, Flame } from "lucide-react";
import { bumpBadgeStat } from "@/lib/badges";
import { HL_BASE_XP, HL_PENALTY, newHLRound, streakMultiplier, type HLRound } from "@/lib/games";

export function HigherLower({ onAward }: { onAward: (xp: number) => void }) {
  const { t } = useTranslation();
  const [round, setRound] = useState<HLRound>(() => newHLRound());
  const [streak, setStreak] = useState(0);
  const [best, setBest] = useState(0);
  const [result, setResult] = useState<{ ok: boolean; xp: number } | null>(null);
  const [revealed, setRevealed] = useState(false);

  const mult = useMemo(() => streakMultiplier(streak), [streak]);

  const answer = (higher: boolean) => {
    if (revealed) return;
    const correct = higher ? round.b.core[round.stat] >= round.a.core[round.stat] : round.b.core[round.stat] <= round.a.core[round.stat];
    const gained = correct ? HL_BASE_XP * mult : HL_PENALTY;
    setRevealed(true);
    setResult({ ok: correct, xp: gained });
    onAward(gained);
    if (correct) {
      bumpBadgeStat("higherLowerWins");
      setStreak((s) => {
        const next = s + 1;
        setBest((b) => Math.max(b, next));
        return next;
      });
    } else {
      setStreak(0);
    }
  };

  const next = () => {
    setRound(newHLRound(round.b.id));
    setRevealed(false);
    setResult(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/15 px-3 py-1 text-sm font-bold text-accent">
          <Flame className="h-4 w-4" /> {t("games.hl.streak")}: {streak} · X{mult}
        </span>
        <span className="text-xs text-muted-foreground">
          {t("games.hl.best")}: {best}
        </span>
      </div>

      <p className="text-sm text-muted-foreground">
        {t("games.hl.question", { stat: t(`stat.${round.stat}`, round.stat.toUpperCase()) })}
      </p>

      <div className="grid grid-cols-2 gap-3">
        <div className="card-surface rounded-2xl p-4 text-center">
          <div className="text-3xl">{round.a.nation}</div>
          <div className="mt-1 truncate text-sm font-bold">{round.a.name}</div>
          <div className="text-xs text-muted-foreground">{round.a.club}</div>
          <div className="mt-3 text-3xl font-extrabold text-primary">{round.a.core[round.stat]}</div>
        </div>
        <div className="card-surface rounded-2xl p-4 text-center">
          <div className="text-3xl">{round.b.nation}</div>
          <div className="mt-1 truncate text-sm font-bold">{round.b.name}</div>
          <div className="text-xs text-muted-foreground">{round.b.club}</div>
          <div className="mt-3 text-3xl font-extrabold">
            {revealed ? <span className="text-accent">{round.b.core[round.stat]}</span> : "?"}
          </div>
        </div>
      </div>

      {!revealed ? (
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => answer(true)}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 font-bold text-primary-foreground transition-transform active:scale-95"
          >
            <ChevronUp className="h-5 w-5" /> {t("games.hl.higher")}
          </button>
          <button
            onClick={() => answer(false)}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-border bg-secondary/60 px-4 py-3 font-bold transition-transform active:scale-95"
          >
            <ChevronDown className="h-5 w-5" /> {t("games.hl.lower")}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <p className={`text-center text-sm font-bold ${result?.ok ? "text-primary" : "text-destructive"}`}>
            {result?.ok ? t("games.correct") : t("games.wrong")} · {result && result.xp > 0 ? "+" : ""}
            {result?.xp} XP
          </p>
          <button
            onClick={next}
            className="w-full rounded-2xl bg-accent px-4 py-3 font-bold text-background transition-transform active:scale-95"
          >
            {t("games.next")}
          </button>
        </div>
      )}
    </div>
  );
}
