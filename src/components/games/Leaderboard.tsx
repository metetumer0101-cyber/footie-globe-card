import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { fetchGlobalLeaderboard, fetchWeeklyLeaderboard, type LeaderboardRow } from "@/hooks/use-xp";
import { RankBadge } from "./RankBadge";

export function Leaderboard({ currentUserId }: { currentUserId?: string | null }) {
  const { t } = useTranslation();
  const [tab, setTab] = useState<"global" | "weekly">("global");
  const [rows, setRows] = useState<LeaderboardRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (tab === "global" ? fetchGlobalLeaderboard() : fetchWeeklyLeaderboard()).then((data) => {
      if (cancelled) return;
      setRows(data);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [tab]);

  return (
    <section className="card-surface rounded-3xl p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-extrabold">{t("games.leaderboard")}</h2>
        <div className="flex rounded-full border border-border bg-secondary/50 p-1 text-xs font-semibold">
          {(["global", "weekly"] as const).map((k) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              className={`rounded-full px-3 py-1.5 transition-colors ${
                tab === k ? "bg-primary text-primary-foreground" : "text-muted-foreground"
              }`}
            >
              {t(`games.${k}`)}
            </button>
          ))}
        </div>
      </div>

      <ol className="mt-3 space-y-1.5">
        {loading && <li className="py-6 text-center text-sm text-muted-foreground">…</li>}
        {!loading && rows.length === 0 && (
          <li className="py-6 text-center text-sm text-muted-foreground">{t("games.emptyBoard")}</li>
        )}
        {rows.map((row, i) => (
          <li
            key={row.id}
            className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 ${
              row.id === currentUserId ? "bg-primary/15 ring-1 ring-primary/40" : "bg-secondary/40"
            }`}
          >
            <span className="w-6 shrink-0 text-sm font-extrabold text-muted-foreground">{i + 1}</span>
            <span className="min-w-0 flex-1 truncate text-sm font-semibold">{row.display_name}</span>
            <RankBadge xp={row.xp} />
            <span className="shrink-0 text-sm font-extrabold text-accent">{row.xp}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
