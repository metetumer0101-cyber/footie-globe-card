import { useMemo, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { CalendarDays, ChevronRight, Flame, Heart, Sparkles, Star, Trophy } from "lucide-react";
import { teams } from "@/data/football";
import { useFavorites } from "@/hooks/use-favorites";
import { useLiveFeed } from "@/hooks/use-live-feed";
import { sortFixtures } from "@/lib/live";
import { cn } from "@/lib/utils";
import type { LiveFixture } from "@/lib/live";
import { favoriteTeamName, isDerbyMatth, isFeaturedMatch, teamNextPrev, weeklyBestByLeague } from "./homeData";

const PICKER_KEY = "footcard:fav-team-intro";

/* ---------------- Rule 1: favorite team picker ---------------- */

function FavoriteTeamPicker() {
  const { t } = useTranslation();
  const { favorites, toggle, ready } = useFavorites();

  const [hidden, setHidden] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      return window.localStorage.getItem(PICKER_KEY) === "1";
    } catch {
      return false;
    }
  });

  if (!ready || hidden || favorites.teams.length > 0) return null;

  const dismiss = () => {
    try {
      window.localStorage.setItem(PICKER_KEY, "1");
    } catch {
      /* ignore */
    }
    setHidden(true);
  };

  const pick = (id: string) => {
    toggle("team", id);
    dismiss();
  };

  return (
    <section className="card-surface glow relative mt-4 overflow-hidden rounded-3xl p-4">
      <div className="absolute -end-10 -top-10 h-32 w-32 rounded-full gradient-pitch opacity-25 blur-2xl" />
      <header className="relative flex items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-base font-extrabold">
            <Heart className="h-4 w-4 text-primary" />
            {t("home.pickTeamTitle", { defaultValue: "Pick your favorite team" })}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("home.pickTeamSubtitle", {
              defaultValue: "We'll surface your team's matches here every time you visit.",
            })}
          </p>
        </div>
        <button
          onClick={dismiss}
          aria-label={t("onboarding.skip", { defaultValue: "Skip" })}
          className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          ×
        </button>
      </header>

      <div className="relative mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4">
        {teams.map((team) => {
          const selected = favorites.teams.includes(team.id);
          return (
            <button
              key={team.id}
              onClick={() => pick(team.id)}
              className={cn(
                "flex flex-col items-center gap-1.5 rounded-2xl border p-3 transition-colors",
                selected
                  ? "border-primary bg-primary/10"
                  : "border-border bg-secondary/30 hover:bg-secondary/60",
              )}
            >
              <span className="grid h-11 w-11 place-items-center rounded-full bg-secondary/60 text-2xl">
                {team.clubBadge}
              </span>
              <span className="w-full truncate text-center text-xs font-semibold">{team.name}</span>
              <span className="w-full truncate text-center text-[10px] text-muted-foreground">
                {team.league}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

/* ---------------- Match card (shared by rule 2 & 4) ---------------- */

function MatchRow({ fixture, isDerby }: { fixture: LiveFixture; isDerby: boolean }) {
  const { t } = useTranslation();
  return (
    <Link
      to="/live/$fixtureId"
      params={{ fixtureId: fixture.id }}
      className="card-surface flex items-center justify-between gap-2 rounded-2xl px-3 py-2.5 transition-colors hover:bg-secondary/40"
    >
      <div className="min-w-0 flex-1 text-right">
        <div className="truncate text-sm font-semibold">{fixture.home.name}</div>
        <div className="truncate text-[10px] text-muted-foreground">{fixture.league}</div>
      </div>
      <div className="shrink-0 text-center">
        <span className="text-sm font-extrabold tabular-nums">
          {fixture.home.score}-{fixture.away.score}
        </span>
        <span
          className={cn(
            "mt-0.5 block rounded-full px-1.5 text-[9px] font-bold",
            fixture.status === "live"
              ? "bg-primary/20 text-primary"
              : fixture.status === "finished"
                ? "bg-secondary text-muted-foreground"
                : isDerby
                  ? "bg-accent/20 text-accent"
                  : "bg-secondary/60 text-muted-foreground",
          )}
        >
          {isDerby
            ? t("home.derby", { defaultValue: "DERBİ" })
            : fixture.status === "live"
              ? `${fixture.minute ?? 0}'`
              : fixture.status === "finished"
                ? "FT"
                : fixture.kickoff}
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold">{fixture.away.name}</div>
        <div className="truncate text-[10px] text-muted-foreground">
          {t("home.vs", { defaultValue: "vs" })} · {fixture.status}
        </div>
      </div>
    </Link>
  );
}

/* ---------------- Rule 2: favorite team's next + previous match ---------------- */

function FavoriteTeamMatches() {
  const { t } = useTranslation();
  const { favorites, ready } = useFavorites();
  const { data, isLoading } = useLiveFeed();

  const teamName = useMemo(() => favoriteTeamName(favorites.teams), [favorites.teams]);
  const { next, prev } = useMemo(() => {
    const fixtures = data?.fixtures ?? [];
    return teamNextPrev(fixtures, teamName);
  }, [data, teamName]);

  if (!ready) return null;
  if (!teamName || (!next && !prev)) return null;

  const cards = [
    next ? (
      <div key="next" className="min-w-0 flex-1">
        <div className="mb-1 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-primary">
          <CalendarDays className="h-3 w-3" />
          {t("home.nextMatch", { defaultValue: `Next · ${teamName}` })}
        </div>
        <MatchRow fixture={next} isDerby={false} />
      </div>
    ) : null,
    prev ? (
      <div key="prev" className="min-w-0 flex-1">
        <div className="mb-1 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
          <ChevronRight className="h-3 w-3" />
          {t("home.prevMatch", { defaultValue: `Prev · ${teamName}` })}
        </div>
        <MatchRow fixture={prev} isDerby={false} />
      </div>
    ) : null,
  ];

  return (
    <section className="mt-6">
      <h2 className="mb-3 flex items-center gap-2 text-base font-bold">
        <Sparkles className="h-4 w-4 text-accent" />
        {t("home.favMatchesTitle", { defaultValue: "Your team's matches" })}
      </h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {cards.filter(Boolean)}
        {isLoading && (
          <p className="text-sm text-muted-foreground">
            {t("home.loading", { defaultValue: "Loading…" })}
          </p>
        )}
      </div>
    </section>
  );
}

/* ---------------- Rule 3: weekly best players (one per league) ---------------- */

function WeeklyBestPlayers() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const sections = useMemo(() => weeklyBestByLeague(), []);

  if (!sections.length) return null;

  return (
    <section className="mt-7">
      <div className="mb-3 flex items-center gap-2">
        <h2 className="text-base font-bold">
          {t("home.weeklyBestTitle", { defaultValue: "Weekly best of each league" })}
        </h2>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {sections.map(({ league, player }) => (
          <button
            key={league}
            onClick={() => void navigate({ to: "/player/$id", params: { id: player.id } })}
            className="card-surface flex items-center gap-3 rounded-2xl p-3 text-left transition-colors hover:bg-secondary/40"
          >
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-secondary/50 text-xl">
              {player.clubBadge || "⚽"}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <Star className="h-3.5 w-3.5 shrink-0 text-accent" />
                <h3 className="truncate text-sm font-bold">{player.name}</h3>
              </div>
              <p className="truncate text-xs text-muted-foreground">
                {player.nation} {player.club} · {player.position} · {league}
              </p>
              <p className="mt-0.5 flex items-center gap-1 text-xs font-semibold text-primary">
                <Flame className="h-3 w-3" />
                {t("home.form", { defaultValue: "Form" })} {player.form}
              </p>
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
          </button>
        ))}
      </div>
    </section>
  );
}

/* ---------------- Rule 4: key matches & derbies of the week ---------------- */

function KeyMatches() {
  const { t } = useTranslation();
  const { data, isLoading } = useLiveFeed();

  const rows = useMemo(() => {
    const fixtures = data?.fixtures ?? [];
    const sorted = sortFixtures(fixtures);
    const featured = sorted.filter(
      (f) => isDerbyMatth(f.home.name, f.away.name) || isFeaturedMatch(f.home.name, f.away.name),
    );
    const fallback = sorted.slice(0, 4);
    const picks: { fixture: LiveFixture; derby: boolean }[] = [];
    const seen = new Set<string>();
    for (const f of featured.length ? featured : fallback) {
      if (seen.has(f.id)) continue;
      seen.add(f.id);
      picks.push({ fixture: f, derby: isDerbyMatth(f.home.name, f.away.name) });
      if (picks.length >= 4) break;
    }
    return picks;
  }, [data]);

  if (!isLoading && !rows.length) return null;

  return (
    <section className="mt-7">
      <h2 className="mb-3 flex items-center gap-2 text-base font-bold">
        <Trophy className="h-4 w-4 text-primary" />
        {t("home.keyMatchesTitle", { defaultValue: "Matches & derbies of the week" })}
      </h2>
      <div className="space-y-2">
        {rows.map(({ fixture, derby }) => (
          <MatchRow key={fixture.id} fixture={fixture} isDerby={derby} />
        ))}
        {!rows.length && (
          <p className="text-sm text-muted-foreground">
            {t("home.loading", { defaultValue: "Loading…" })}
          </p>
        )}
      </div>
    </section>
  );
}

/* ---------------- Hero (simplified welcome) ---------------- */

function HomeHero() {
  const { t } = useTranslation();
  return (
    <section className="card-surface glow relative overflow-hidden rounded-3xl p-5">
      <div className="absolute -end-10 -top-10 h-36 w-36 rounded-full gradient-pitch opacity-25 blur-2xl" />
      <div className="relative">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-accent">
          <Trophy className="h-3 w-3" />
          {t("home.heroTag", { defaultValue: "Football scouting, reimagined" })}
        </span>
        <h1 className="mt-3 text-2xl font-extrabold leading-tight">
          {t("home.heroTitle", { defaultValue: "Scout. Compare. Build your squad." })}
        </h1>
        <p className="mt-1.5 max-w-md text-sm text-muted-foreground">
          {t("home.heroSubtitle", {
            defaultValue:
              "Follow your favorite team, discover the week's best players and the biggest derbies — all in one dark, fast feed.",
          })}
        </p>
      </div>
    </section>
  );
}

/* ---------------- Page ---------------- */

export function HomePage() {
  return (
    <div>
      <HomeHero />
      <FavoriteTeamPicker />
      <FavoriteTeamMatches />
      <WeeklyBestPlayers />
      <KeyMatches />
    </div>
  );
}
