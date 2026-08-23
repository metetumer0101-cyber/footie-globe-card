import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { getWeeklyXIPool, type WeeklyXiEntry } from "@/lib/player-search.functions";
import { WXI_PICK_COUNT, weeklyXiXp } from "@/lib/games";
import { Loader2, RefreshCcw, Shield } from "lucide-react";

const DAILY_KEY = (d: Date) =>
  `footcard:weeklyxi:${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;

function alreadyPlayedToday(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(DAILY_KEY(new Date())) === "1";
}

export function WeeklyXiGame({ onAward }: { onAward: (xp: number) => void }) {
  const { t } = useTranslation();
  const [pool, setPool] = useState<WeeklyXiEntry[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [picked, setPicked] = useState<Set<number>>(new Set());
  const [revealed, setRevealed] = useState(false);
  const [awarded, setAwarded] = useState(0);
  const [playedToday, setPlayedToday] = useState(false);
  const awardedOnce = useRef(false);

  const load = useCallback(async () => {
    setLoading(true);
    setPicked(new Set());
    setRevealed(false);
    setAwarded(0);
    awardedOnce.current = false;
    try {
      const list = await getWeeklyXIPool();
      setPool(list);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setPlayedToday(alreadyPlayedToday());
    void load();
  }, [load]);

  const toggle = (id: number) => {
    if (revealed || playedToday) return;
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (next.size < WXI_PICK_COUNT) next.add(id);
      return next;
    });
  };

  const { ideal, idealCount } = useMemo(() => {
    if (!pool) return { ideal: [], idealCount: 0 };
    const sorted = [...pool].sort((a, b) => b.goals - a.goals).slice(0, WXI_PICK_COUNT);
    return { ideal: sorted, idealCount: sorted.reduce((s, p) => s + p.goals, 0) };
  }, [pool]);

  const submit = () => {
    if (!pool || picked.size !== WXI_PICK_COUNT || revealed || playedToday) return;
    const selected = pool.filter((p) => picked.has(p.id));
    const score = selected.reduce((s, p) => s + p.goals, 0);
    const xp = weeklyXiXp(score, idealCount);
    setRevealed(true);
    setAwarded(xp);
    window.localStorage.setItem(DAILY_KEY(new Date()), "1");
    setPlayedToday(true);
    awardedOnce.current = true;
    onAward(xp);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> {t("games.wxi.loading")}
      </div>
    );
  }

  if (!pool || pool.length < WXI_PICK_COUNT) {
    return (
      <div className="space-y-3 py-6 text-center">
        <Shield className="mx-auto h-8 w-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">{t("games.wxi.empty")}</p>
        <Button variant="outline" size="sm" onClick={() => void load()}>
          <RefreshCcw className="mr-1.5 h-4 w-4" /> {t("games.wxi.retry")}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {t("games.wxi.pick", { count: WXI_PICK_COUNT })} · {picked.size}/{WXI_PICK_COUNT}
        </p>
        {playedToday ? (
          <span className="rounded-full bg-accent/15 px-3 py-1 text-xs font-bold text-accent">
            {t("games.wxi.playedToday")}
          </span>
        ) : (
          <span className="rounded-full bg-secondary/60 px-3 py-1 text-xs font-semibold text-muted-foreground">
            {t("games.wxi.hidden")}
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {pool.map((p) => {
          const isPicked = picked.has(p.id);
          const inIdeal = revealed && ideal.some((i) => i.id === p.id);
          return (
            <button
              key={p.id}
              onClick={() => toggle(p.id)}
              disabled={revealed}
              className={`flex flex-col items-center gap-1 rounded-2xl border p-3 text-center transition-colors ${
                isPicked
                  ? "border-primary/60 bg-primary/15"
                  : revealed && inIdeal
                    ? "border-accent/60 bg-accent/10"
                    : "border-border bg-secondary/40 hover:border-primary/40"
              }`}
            >
              {p.photo ? (
                <img src={p.photo} alt={p.name} className="h-10 w-10 rounded-full object-cover" loading="lazy" />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-base">{"⚽"}</div>
              )}
              <div className="w-full truncate text-xs font-bold">{p.name}</div>
              <div className="w-full truncate text-[10px] text-muted-foreground">
                {p.club ?? "—"}
                {p.position ? ` · ${p.position}` : ""}
              </div>
              {revealed ? (
                <div className={`text-sm font-extrabold ${inIdeal ? "text-accent" : "text-muted-foreground"}`}>
                  {p.goals} {t("games.wxi.goals")}
                </div>
              ) : (
                <div className="text-sm font-extrabold text-muted-foreground">?</div>
              )}
            </button>
          );
        })}
      </div>

      {!revealed ? (
        <Button
          onClick={submit}
          disabled={picked.size !== WXI_PICK_COUNT || playedToday}
          className="w-full"
        >
          {t("games.wxi.submit")}
        </Button>
      ) : (
        <div className="space-y-3">
          <p className="text-center text-sm font-bold text-primary">
            {t("games.wxi.result", { xp: awarded })} · +{awarded} XP
          </p>
          <Button variant="outline" onClick={() => void load()} className="w-full">
            <RefreshCcw className="mr-1.5 h-4 w-4" /> {t("games.wxi.newPool")}
          </Button>
        </div>
      )}
    </div>
  );
}
