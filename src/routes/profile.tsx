import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { LogOut, Settings2, Trophy, UserRound } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { RankBadge } from "@/components/games/RankBadge";
import { useXp } from "@/hooks/use-xp";
import { nextRank, rankFor, rankProgress } from "@/lib/ranks";
import { supabase } from "@/integrations/supabase/client";
import { languages, STORAGE_KEY } from "@/i18n";
import { readSettings, writeSettings } from "@/lib/settings";
import { teams } from "@/data/football";
import { BadgeShowcase } from "@/components/profile/BadgeShowcase";
import { emptyBadgeStats, readLocalBadgeStats, type BadgeStats } from "@/lib/badges";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Profile — FootCard Scout Rank & XP" },
      { name: "description", content: "Your FootCard scout rank, earned XP, saved cards and game activity." },
      { property: "og:title", content: "Profile — FootCard" },
      { property: "og:description", content: "Track your scout rank badge and XP progress on FootCard." },
      { property: "og:type", content: "profile" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Page,
});

const LEAGUE_OPTIONS = [...new Set(teams.map((tm) => tm.league))].sort();

function Page() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { xp, displayName, rename, isGuest, user } = useXp();
  const [name, setName] = useState(displayName);

  useEffect(() => setName(displayName), [displayName]);

  const [badgeStats, setBadgeStats] = useState<BadgeStats>(emptyBadgeStats);
  useEffect(() => setBadgeStats(readLocalBadgeStats()), []);

  const [favLeague, setFavLeague] = useState("");
  useEffect(() => setFavLeague(readSettings().league ?? ""), []);

  const changeLanguage = (code: string) => {
    void i18n.changeLanguage(code);
    window.localStorage.setItem(STORAGE_KEY, code);
    const meta = languages.find((l) => l.code === code);
    document.documentElement.lang = code;
    document.documentElement.dir = meta?.rtl ? "rtl" : "ltr";
  };

  const rank = rankFor(xp);
  const next = nextRank(xp);

  const signOut = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  return (
    <AppShell>
      <div className="space-y-5">
        <section className="card-surface rounded-3xl p-5 text-center">
          <span className="mx-auto grid h-20 w-20 place-items-center rounded-full gradient-pitch text-3xl">
            <UserRound className="h-9 w-9 text-background" />
          </span>
          <h1 className="mt-3 text-xl font-extrabold">{displayName}</h1>
          {user?.email && <p className="text-xs text-muted-foreground">{user.email}</p>}
          <div className="mt-3 flex items-center justify-center gap-2">
            <RankBadge rank={rank} size="lg" />
            <span className="text-lg font-extrabold text-accent">{xp} XP</span>
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
        </section>

        <BadgeShowcase stats={{ ...badgeStats, xp }} />

        <section className="card-surface space-y-3 rounded-3xl p-4">
          <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
            <Settings2 className="h-4 w-4" />
            {t("settings.title")}
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-muted-foreground">
                {t("settings.language")}
              </span>
              <select
                value={i18n.resolvedLanguage ?? "en"}
                onChange={(e) => changeLanguage(e.target.value)}
                className="w-full rounded-2xl border border-border bg-surface px-3 py-2.5 text-sm outline-none focus:border-primary"
              >
                {languages.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.flag} {l.native}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-muted-foreground">
                {t("settings.league")}
              </span>
              <select
                value={favLeague}
                onChange={(e) => {
                  const league = e.target.value;
                  setFavLeague(league);
                  writeSettings({ league: league || undefined });
                }}
                className="w-full rounded-2xl border border-border bg-surface px-3 py-2.5 text-sm outline-none focus:border-primary"
              >
                <option value="">{t("settings.leagueNone")}</option>
                {LEAGUE_OPTIONS.map((lg) => (
                  <option key={lg} value={lg}>
                    {lg}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </section>

        {isGuest ? (
          <Link
            to="/auth"
            className="block rounded-3xl bg-primary px-4 py-3 text-center font-bold text-primary-foreground"
          >
            {t("auth.signIn")}
          </Link>
        ) : (
          <section className="card-surface space-y-3 rounded-3xl p-4">
            <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t("auth.displayName")}
            </label>
            <div className="flex gap-2">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="min-w-0 flex-1 rounded-2xl border border-border bg-surface px-4 py-3 text-sm outline-none focus:border-primary"
              />
              <button
                onClick={async () => {
                  await rename(name.trim() || "Scout");
                  toast.success(t("auth.saved"));
                }}
                className="rounded-2xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground"
              >
                {t("sq.save")}
              </button>
            </div>
            <button
              onClick={signOut}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-border bg-secondary/60 px-4 py-3 text-sm font-bold"
            >
              <LogOut className="h-4 w-4" /> {t("auth.signOut")}
            </button>
          </section>
        )}

        <Link
          to="/games"
          className="card-surface flex items-center gap-3 rounded-3xl p-4 transition-colors hover:bg-secondary/40"
        >
          <Trophy className="h-5 w-5 text-accent" />
          <span className="font-bold">{t("games.title")}</span>
        </Link>
      </div>
    </AppShell>
  );
}
