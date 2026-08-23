import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  CalendarDays,
  ChevronRight,
  Flame,
  Heart,
  Loader2,
  Search,
  Sparkles,
  Star,
  Trophy,
} from "lucide-react";
import { useFavorites } from "@/hooks/use-favorites";
import { useLiveFeed } from "@/hooks/use-live-feed";
import { useSystemStatus } from "@/hooks/use-system-status";
import { QuotaStateCard } from "@/components/home/QuotaStateCard";
import { sortFixtures } from "@/lib/live";
import { cn } from "@/lib/utils";
import type { LiveFixture } from "@/lib/live";
import { searchWorldTeams } from "@/lib/entity.functions";
import { getFavoriteTeamMatches } from "@/lib/team-matches.functions";
import { getHomeWeeklyBest, type HomeLeagueBest } from "@/lib/player-search.functions";
import { favoriteTeamMetaFor, saveTeamMeta } from "@/lib/team-meta";
import { isDerbyMatth, isFeaturedMatch } from "./homeData";

const PICKER_KEY = "footcard:fav-team-intro";

type TeamSearchHitItem = { id: number; name: string; logo?: string; country?: string };

/* ---------------- Rule 1: favorite team search box ---------------- */

function TeamSearchPicker() {
  const { t } = useTranslation();
  const { favorites, toggle, ready } = useFavorites();
  const searchApi = useServerFn(searchWorldTeams);

  const [hidden, setHidden] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      return window.localStorage.getItem(PICKER_KEY) === "1";
    } catch {
      return false;
    }
  });

  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [results, setResults] = useState<TeamSearchHitItem[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  // Debounce the query input (300 ms) before hitting the server function.
  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(query.trim()), 300);
    return () => window.clearTimeout(id);
  }, [query]);

  // Run the worldwide team search once the debounced query is long enough.
  useEffect(() => {
    let cancelled = false;
    if (debounced.length < 3) {
      setResults([]);
      setSearched(false);
      setOpen(false);
      setLoading(false);
      return;
    }
    setLoading(true);
    setSearched(true);
    searchApi({ data: { query: debounced } })
      .then((hits) => {
        if (cancelled) return;
        setResults((hits ?? []).map((h) => ({ id: h.id, name: h.name, logo: h.logo, country: h.country })));
        setOpen(true);
      })
      .catch(() => {
        if (cancelled) return;
        setResults([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [debounced, searchApi]);

  // Close the dropdown on outside click.
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  if (!ready || hidden || favorites.teams.length > 0) return null;

  const dismiss = () => {
    try {
      window.localStorage.setItem(PICKER_KEY, "1");
    } catch {
      /* ignore */
    }
    setHidden(true);
  };

  const pick = (hit: TeamSearchHitItem) => {
    const id = String(hit.id);
    // Store the API-Football team id as the favorite (matches what fixtures use).
    toggle("team", id);
    // Remember the display identity so Rule 2 can render name/logo + match fixtures.
    saveTeamMeta({ id, name: hit.name, logo: hit.logo, country: hit.country });
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
              defaultValue: "Search any club in the world — we'll surface its matches here.",
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

      <div ref={boxRef} className="relative mt-4">
        <div className="flex items-center gap-2 rounded-2xl border border-border bg-secondary/30 px-3 py-2.5">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setResults([]);
            }}
            onFocus={() => debounced.length >= 3 && setOpen(true)}
            placeholder={t("home.teamSearchPlaceholder", {
              defaultValue: "Search a club… e.g. Galatasaray",
            })}
            className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          {loading && <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />}
        </div>

        {open && debounced.length >= 3 && (
          <div className="absolute z-10 mt-1 max-h-72 w-full overflow-auto rounded-2xl border border-border bg-background/95 p-1 shadow-xl backdrop-blur">
            {loading && results.length === 0 && (
              <p className="px-3 py-3 text-sm text-muted-foreground">
                {t("home.loading", { defaultValue: "Loading…" })}
              </p>
            )}
            {!loading && searched && results.length === 0 && (
              <p className="px-3 py-3 text-sm text-muted-foreground">
                {t("home.noTeamResults", { defaultValue: "No clubs found. Try another name." })}
              </p>
            )}
            {results.length > 0 &&
              results.map((hit) => (
                <button
                  key={hit.id}
                  onClick={() => pick(hit)}
                  className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition-colors hover:bg-secondary/60"
                >
                  {hit.logo ? (
                    <img
                      src={hit.logo}
                      alt=""
                      loading="lazy"
                      className="h-8 w-8 shrink-0 rounded-full bg-white/10 object-contain"
                    />
                  ) : (
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-secondary/60 text-base">
                      ⚽
                    </span>
                  )}
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold">{hit.name}</span>
                    <span className="block truncate text-[10px] text-muted-foreground">
                      {hit.country || hit.name}
                    </span>
                  </span>
                </button>
              ))}
          </div>
        )}
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

/* ---------------- Skeleton loaders (dark-theme placeholders while data fetches) ---------------- */

/** One pulsing grey bar — the base building block for every skeleton. */
function SkeletonBar({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn("animate-pulse rounded-full bg-secondary/60", className)} />;
}

/** Skeleton matching the layout of {@link MatchRow} (home/away names, score, kickoff pill). */
function MatchRowSkeleton() {
  return (
    <div aria-hidden="true" className="card-surface flex items-center justify-between gap-2 rounded-2xl px-3 py-2.5">
      <div className="min-w-0 flex-1 space-y-2">
        <SkeletonBar className="ms-auto h-3 w-24" />
        <SkeletonBar className="ms-auto h-2 w-16" />
      </div>
      <div className="shrink-0 space-y-1.5 text-center">
        <SkeletonBar className="mx-auto h-4 w-8" />
        <SkeletonBar className="mx-auto h-2.5 w-10" />
      </div>
      <div className="min-w-0 flex-1 space-y-2">
        <SkeletonBar className="h-3 w-24" />
        <SkeletonBar className="h-2 w-16" />
      </div>
    </div>
  );
}

/** Skeleton matching a weekly-best player row (avatar, name, league, chevron). */
function PlayerRowSkeleton() {
  return (
    <div aria-hidden="true" className="card-surface flex items-center gap-3 rounded-2xl p-3">
      <SkeletonBar className="h-12 w-12 shrink-0 rounded-full" />
      <div className="min-w-0 flex-1 space-y-2">
        <SkeletonBar className="h-3 w-28" />
        <SkeletonBar className="h-2 w-40" />
        <SkeletonBar className="h-2 w-16" />
      </div>
      <SkeletonBar className="h-4 w-4 shrink-0 rounded-full" />
    </div>
  );
}

function FavoriteMatchesSkeleton({ ariaLabel }: { ariaLabel: string }) {
  return (
    <div role="status" aria-label={ariaLabel} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <MatchRowSkeleton />
      <MatchRowSkeleton />
    </div>
  );
}

function WeeklyBestSkeleton({ ariaLabel }: { ariaLabel: string }) {
  return (
    <div role="status" aria-label={ariaLabel} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <PlayerRowSkeleton />
      <PlayerRowSkeleton />
      <PlayerRowSkeleton />
      <PlayerRowSkeleton />
    </div>
  );
}

function KeyMatchesSkeleton({ ariaLabel }: { ariaLabel: string }) {
  return (
    <div role="status" aria-label={ariaLabel} className="space-y-2">
      <MatchRowSkeleton />
      <MatchRowSkeleton />
      <MatchRowSkeleton />
      <MatchRowSkeleton />
    </div>
  );
}

/* ---------------- Rule 2: favorite team's next + previous match ---------------- */

function FavoriteTeamMatches() {
  const { t } = useTranslation();
  const { favorites, ready } = useFavorites();
  const fetchMatches = useServerFn(getFavoriteTeamMatches);

  const favoriteId = favorites.teams[0];
  // Resolve the favorite's display identity (persisted when it was picked).
  const teamMeta = favoriteId ? favoriteTeamMetaFor(favoriteId) : undefined;
  const teamName = teamMeta?.name ?? favoriteId;
  const teamId = favoriteId ? Number(favoriteId) : undefined;

  // Real next/prev from the team's own season fixtures (not just today's feed),
  // so the section renders even when the team has no match today.
  const { data, isLoading } = useQuery({
    queryKey: ["fav-team-matches", favoriteId],
    queryFn: () => fetchMatches({ data: { teamId: Number(favoriteId) } }),
    enabled: ready && Boolean(teamId && Number.isFinite(teamId)),
    staleTime: 5 * 60 * 1000,
  });

  const next = data?.next;
  const prev = data?.prev;

  if (!ready) return null;
  if (!teamName) return null;

  // Honest empty state — never fabricate data: if the API found no matches,
  // say so instead of silently hiding the section (or inventing scores).
  if (!isLoading && !next && !prev) {
    return (
      <section className="mt-6">
        <h2 className="mb-3 flex items-center gap-2 text-base font-bold">
          <Sparkles className="h-4 w-4 text-accent" />
          {t("home.favMatchesTitle", { defaultValue: "Your team's matches" })}
        </h2>
        <p className="text-sm text-muted-foreground">
          {t("home.noTeamMatches", {
            defaultValue: `No upcoming or recent matches found for ${teamName}.`,
          })}
        </p>
      </section>
    );
  }

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
      {isLoading && !next && !prev ? (
        <FavoriteMatchesSkeleton
          ariaLabel={t("home.favMatchesLoadingAria", {
            defaultValue: "Loading your team's upcoming and last matches",
          })}
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{cards.filter(Boolean)}</div>
      )}
    </section>
  );
}

/* ---------------- Rule 3: weekly best players (one per league, real data) ---------------- */

function WeeklyBestPlayers() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const fetchBest = useServerFn(getHomeWeeklyBest);

  const { data: sections = [], isLoading } = useQuery<HomeLeagueBest[]>({
    queryKey: ["home-weekly-best"],
    queryFn: () => fetchBest(),
    staleTime: 30 * 60 * 1000,
  });

  if (!isLoading && sections.length === 0) return null;

  return (
    <section className="mt-7">
      <div className="mb-3 flex items-center gap-2">
        <h2 className="text-base font-bold">
          {t("home.weeklyBestTitle", { defaultValue: "Weekly best of each league" })}
        </h2>
      </div>
      {isLoading ? (
        <WeeklyBestSkeleton
          ariaLabel={t("home.weeklyBestLoadingAria", {
            defaultValue: "Loading this week's best players",
          })}
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {sections.map(({ league, player }) => (
            <button
              key={league}
              onClick={() =>
                void navigate({ to: "/player/$id", params: { id: `api-${player.id}` } })
              }
              className="card-surface flex items-center gap-3 rounded-2xl p-3 text-left transition-colors hover:bg-secondary/40"
            >
              {player.photo ? (
                <img
                  src={player.photo}
                  alt=""
                  loading="lazy"
                  className="h-12 w-12 shrink-0 rounded-full bg-white/10 object-cover"
                />
              ) : (
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-secondary/50 text-xl">
                  ⚽
                </span>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <Star className="h-3.5 w-3.5 shrink-0 text-accent" />
                  <h3 className="truncate text-sm font-bold">{player.name}</h3>
                </div>
                <p className="truncate text-xs text-muted-foreground">
                  {[player.club, player.nation, player.position].filter(Boolean).join(" · ")} · {league}
                </p>
                <p className="mt-0.5 flex items-center gap-1 text-xs font-semibold text-primary">
                  <Flame className="h-3 w-3" />
                  {t("home.topScorer", { defaultValue: "Top scorer" })}
                </p>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            </button>
          ))}
        </div>
      )}
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
      {isLoading && !rows.length ? (
        <KeyMatchesSkeleton
          ariaLabel={t("home.keyMatchesLoadingAria", {
            defaultValue: "Loading this week's key matches and derbies",
          })}
        />
      ) : (
        <div className="space-y-2">
          {rows.map(({ fixture, derby }) => (
            <MatchRow key={fixture.id} fixture={fixture} isDerby={derby} />
          ))}
        </div>
      )}
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
  const { data: systemStatus } = useSystemStatus();
  const { data: liveFeed } = useLiveFeed();
  // Quota is read from the live feed itself (synchronous with its data) so the
  // empty-state card appears immediately, not after a separate status query.
  const quotaExhausted =
    liveFeed?.quotaExhausted === true || systemStatus?.status === "quota";

  return (
    <div>
      <HomeHero />
      <TeamSearchPicker />
      {quotaExhausted && <QuotaStateCard className="mt-4" />}
      <FavoriteTeamMatches />
      <WeeklyBestPlayers />
      <KeyMatches />
    </div>
  );
}
