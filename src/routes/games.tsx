import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Gamepad2, Route as RouteIcon, ScanSearch, Shield, TrendingUp } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { HigherLower } from "@/components/games/HigherLower";
import { TransferPathGame } from "@/components/games/TransferPathGame";
import { DailyPlayerGame } from "@/components/games/DailyPlayerGame";
import { WeeklyXiGame } from "@/components/games/WeeklyXiGame";
import { Leaderboard } from "@/components/games/Leaderboard";
import { RankBadge } from "@/components/games/RankBadge";
import { useXp } from "@/hooks/use-xp";
import { nextRank, rankFor, rankProgress } from "@/lib/ranks";
import type { GameKey } from "@/lib/games";

export const Route = createFileRoute("/games")({
  head: () => ({
    meta: [
      { title: "Games Hub — FootCard Football Trivia & XP" },
      {
        name: "description",
        content:
          "Play Higher or Lower, Transfer Path and the daily player puzzle, earn XP and climb the FootCard scout leaderboard.",
      },
      { property: "og:title", content: "Games Hub — FootCard" },
      {
        property: "og:description",
        content: "Football mini-games with streak multipliers, XP scoring and global scout ranks.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: GamesPage,
});

const games: { key: GameKey; icon: typeof Gamepad2 }[] = [
  { key: "higher_lower", icon: TrendingUp },
  { key: "transfer_path", icon: RouteIcon },
  { key: "daily_player", icon: ScanSearch },
  { key: "weekly_xi", icon: Shield },
];

function GamesPage() {
  const { t } = useTranslation();
  const { xp, displayName, award, isGuest, user } = useXp();
  const [active, setActive] = useState<GameKey>("higher_lower");

  const rank = rankFor(xp);
  const next = nextRank(xp);

  const handleAward = (game: GameKey) => (amount: number) => {
    void award(game, amount);
    if (amount >= 0) toast.success(`+${amount} XP`);
    else toast.error(`${amount} XP`);
  };

  return (
    <AppShell>
      <div className="space-y-5">
        <section className="card-surface rounded-3xl p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <h1 className="flex items-center gap-2 text-2xl font-extrabold tracking-tight">
                <Gamepad2 className="h-6 w-6 text-primary" /> {t("games.title")}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">{t("games.subtitle")}</p>
            </div>
            <div className="text-end">
              <div className="text-2xl font-extrabold text-accent">{xp} XP</div>
              <div className="mt-1 flex items-center justify-end gap-2">
                <RankBadge rank={rank} />
              </div>
            </div>
          </div>

          <div className="mt-4">
            <div className="h-2 overflow-hidden rounded-full bg-secondary/70">
              <div className="h-full rounded-full gradient-pitch" style={{ width: `${rankProgress(xp)}%` }} />
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">
              {next
                ? t("games.toNext", { xp: next.minXp - xp, rank: t(`games.rank.${next.key}`) })
                : t("games.maxRank")}
            </p>
          </div>

          {isGuest && (
            <p className="mt-3 rounded-2xl border border-accent/30 bg-accent/10 px-3 py-2.5 text-xs text-accent">
              {t("games.guestHint")}{" "}
              <Link to="/auth" className="font-bold underline">
                {t("auth.signIn")}
              </Link>
            </p>
          )}
          {!isGuest && (
            <p className="mt-3 text-xs text-muted-foreground">
              {t("games.playingAs")} <span className="font-semibold text-foreground">{displayName}</span>
            </p>
          )}
        </section>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {games.map(({ key, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActive(key)}
              className={`flex flex-col items-center gap-1.5 rounded-2xl border px-2 py-3 text-center text-[11px] font-bold transition-colors ${
                active === key
                  ? "border-primary/50 bg-primary/15 text-primary"
                  : "border-border bg-secondary/40 text-muted-foreground"
              }`}
            >
              <Icon className="h-5 w-5" />
              {t(`games.${key}.name`)}
            </button>
          ))}
        </div>

        <section className="card-surface rounded-3xl p-4">
          <h2 className="mb-3 text-lg font-extrabold">{t(`games.${active}.name`)}</h2>
          {active === "higher_lower" && <HigherLower onAward={handleAward("higher_lower")} />}
          {active === "transfer_path" && <TransferPathGame onAward={handleAward("transfer_path")} />}
          {active === "daily_player" && <DailyPlayerGame onAward={handleAward("daily_player")} />}
          {active === "weekly_xi" && <WeeklyXiGame onAward={handleAward("weekly_xi")} />}
        </section>

        <Leaderboard currentUserId={user?.id ?? null} />
      </div>
    </AppShell>
  );
}
