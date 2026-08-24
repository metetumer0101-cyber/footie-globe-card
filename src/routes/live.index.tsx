import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Radio, RefreshCw, Search, Shield, X } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { MatchDetailModal } from "@/components/live/MatchDetailModal";
import { QuotaStateCard } from "@/components/home/QuotaStateCard";
import { useInplayFeed, LIVE_POLL_MS } from "@/hooks/use-live-feed";
import { useSystemStatus } from "@/hooks/use-system-status";
import { useFavorites } from "@/hooks/use-favorites";
import { bumpBadgeStat } from "@/lib/badges";
import { normalizeLeague } from "@/lib/live";
import type { LiveFixture } from "@/lib/live";

export const Route = createFileRoute("/live/")({
  head: () => ({
    meta: [
      { title: "Live Matches — FootCard Scores & Player Ratings" },
      {
        name: "description",
        content:
          "Live in-play football scores: first half, half-time, second half and match minute trackers on FootCard.",
      },
      { property: "og:title", content: "Live Matches — FootCard" },
      { property: "og:description", content: "Live scores, match minutes and in-play events, updated in real time." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LiveListPage,
});

/** Status tabs — client-side window over the in-play feed. */
type StatusTab = "all" | "first-half" | "halftime" | "second-half" | "favorites";

/** One selectable league in the fixed 15-league horizontal bar. */
type LeagueChip = { id: string; name: string; patterns: string[] };

/**
 * The fixed 15 popular-league bar. Each chip is matched against a fixture's
 * normalized league name; chips are always rendered (muted when a league has no
 * live match right now) — the list is static, never derived from the feed.
 */
const POPULAR_LEAGUES: LeagueChip[] = [
  { id: "super-lig", name: "Süper Lig", patterns: ["super lig", "superlig", "turkish super", "trendyol super"] },
  { id: "sampiyonlar-ligi", name: "Şampiyonlar Ligi", patterns: ["champions league"] },
  { id: "premier-league", name: "Premier League", patterns: ["premier league"] },
  { id: "la-liga", name: "La Liga", patterns: ["la liga", "laliga"] },
  { id: "serie-a", name: "Serie A", patterns: ["serie a", "serie a tim"] },
  { id: "bundesliga", name: "Bundesliga", patterns: ["bundesliga"] },
  { id: "ligue-1", name: "Ligue 1", patterns: ["ligue 1"] },
  { id: "uefa-avrupa-ligi", name: "UEFA Avrupa Ligi", patterns: ["europa league"] },
  { id: "eredivisie", name: "Eredivisie", patterns: ["eredivisie"] },
  { id: "liga-portugal", name: "Liga Portugal", patterns: ["primeira liga", "liga portugal", "liga betclic"] },
  { id: "trendyol-1-lig", name: "Trendyol 1. Lig", patterns: ["1. lig", "1 lig", "trendyol 1", "tff 1"] },
  { id: "saudi-pro-league", name: "Saudi Pro League", patterns: ["saudi", "roshn", "saudi pro"] },
  { id: "mls", name: "MLS", patterns: ["mls", "major league soccer"] },
  { id: "belgisch-pro-league", name: "Belgisch Pro League", patterns: ["jupiler", "belgian", "first division a", "belgium", "proximus"] },
  { id: "copa-libertadores", name: "Copa Libertadores", patterns: ["copa libertadores", "libertadores"] },
];

function matchesLeague(fixture: LiveFixture, chip: LeagueChip): boolean {
  const name = normalizeLeague(fixture.league);
  if (!name) return false;
  return chip.patterns.some((p) => name.includes(normalizeLeague(p)));
}

function isFavoriteFixture(fixture: LiveFixture, favTeams: string[]): boolean {
  return (
    (fixture.home.id != null && favTeams.includes(String(fixture.home.id))) ||
    (fixture.away.id != null && favTeams.includes(String(fixture.away.id)))
  );
}

function matchesTab(fixture: LiveFixture, tab: StatusTab, favTeams: string[]): boolean {
  switch (tab) {
    case "all":
      return true;
    case "first-half":
      return fixture.phase === "first-half";
    case "halftime":
      return fixture.phase === "halftime" || fixture.status === "halftime";
    case "second-half":
      return (
        fixture.phase === "second-half" ||
        fixture.phase === "extra-time" ||
        fixture.phase === "penalties"
      );
    case "favorites":
      return isFavoriteFixture(fixture, favTeams);
  }
}

/** Live minute, e.g. `43'` or `45+2'` when stoppage time is available. */
function minuteLabel(fixture: LiveFixture): string {
  if (fixture.addedTime != null && fixture.addedTime > 0) return `${fixture.minute}+${fixture.addedTime}'`;
  return `${fixture.minute}'`;
}

/** Minimal derived view of a fixture's highlights for the inline icons strip. */
function highlightsStrip(fixture: LiveFixture) {
  const hl = fixture.highlights ?? [];
  const reds = hl.filter((h) => h.kind === "red-card").slice(0, 2);
  const hasPenalty = hl.some((h) => h.kind === "penalty");
  const goals = hl.filter((h) => h.kind === "goal");
  const lastGoal = goals.length
    ? goals.reduce((a, b) => (a.minute >= b.minute ? a : b))
    : undefined;
  return { reds, hasPenalty, lastGoal };
}

function TeamLogo({ logo, badge, name }: { logo?: string | undefined; badge: string; name: string }) {
  if (logo) return <img src={logo} alt={`${name} logo`} loading="lazy" className="h-7 w-7 shrink-0 object-contain" />;
  return <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-secondary text-sm">{badge}</span>;
}

function LivePulseBadge({ minute }: { minute: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/15 px-2.5 py-1">
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
      </span>
      <span className="text-[11px] font-extrabold tabular-nums text-primary">{minute}</span>
    </span>
  );
}

function StatusBadge({
  fixture,
  t,
}: {
  fixture: LiveFixture;
  t: (k: string, o: { defaultValue: string }) => string;
}) {
  if (fixture.status === "halftime") {
    return (
      <span className="inline-flex items-center rounded-full bg-accent/20 px-2.5 py-1 text-[11px] font-extrabold text-accent">
        {t("liveCenter.halftime", { defaultValue: "HT" })}
      </span>
    );
  }
  if (fixture.status === "finished") {
    return (
      <span className="inline-flex items-center rounded-full bg-secondary px-2.5 py-1 text-[11px] font-extrabold text-muted-foreground">
        {t("liveCenter.finished", { defaultValue: "FT" })}
      </span>
    );
  }
  return <LivePulseBadge minute={minuteLabel(fixture)} />;
}

function MatchCard({
  fixture,
  onOpen,
  t,
}: {
  fixture: LiveFixture;
  onOpen: (f: LiveFixture) => void;
  t: (k: string, o: { defaultValue: string }) => string;
}) {
  const { reds, hasPenalty, lastGoal } = highlightsStrip(fixture);
  const showStrip = reds.length > 0 || hasPenalty || lastGoal;

  return (
    <article
      onClick={() => onOpen(fixture)}
      className="card-surface cursor-pointer rounded-3xl p-4 transition-colors hover:bg-secondary/40"
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="truncate text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
          {fixture.league}
        </span>
        <StatusBadge fixture={fixture} t={t} />
      </div>

      <div className="flex items-center gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <TeamLogo logo={fixture.home.logo} badge={fixture.home.badge} name={fixture.home.name} />
          <span className="truncate text-sm font-bold">{fixture.home.name}</span>
        </div>

        <div className="flex shrink-0 items-baseline gap-1">
          <span className="text-2xl font-extrabold tabular-nums leading-none">{fixture.home.score}</span>
          <span className="text-lg font-bold text-muted-foreground">-</span>
          <span className="text-2xl font-extrabold tabular-nums leading-none">{fixture.away.score}</span>
        </div>

        <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
          <span className="truncate text-sm font-bold">{fixture.away.name}</span>
          <TeamLogo logo={fixture.away.logo} badge={fixture.away.badge} name={fixture.away.name} />
        </div>
      </div>

      {showStrip && (
        <div className="mt-2.5 flex items-center gap-2 border-t border-border pt-2 text-[11px] text-muted-foreground">
          {reds.map((r, i) => (
            <span
              key={i}
              title={`${t("liveCenter.redCard", { defaultValue: "Red card" })} — ${r.player}`}
              className="inline-block h-3 w-2 rounded-[2px] bg-destructive"
              aria-hidden
            />
          ))}
          {hasPenalty && (
            <span
              title={t("liveCenter.penalty", { defaultValue: "Penalty" })}
              className="inline-block h-2 w-2 rounded-full bg-accent"
              aria-hidden
            />
          )}
          {lastGoal && (
            <span className="inline-flex min-w-0 items-center gap-1.5">
              <span aria-hidden>⚽</span>
              <span className="truncate font-semibold text-foreground">{lastGoal.player}</span>
              <span className="tabular-nums">{minuteLabel({ ...fixture, minute: lastGoal.minute } as LiveFixture)}</span>
            </span>
          )}
        </div>
      )}
    </article>
  );
}

function SkeletonCard() {
  return (
    <div className="card-surface relative overflow-hidden rounded-3xl p-4">
      <div className="animate-pulse space-y-3">
        <div className="flex items-center justify-between">
          <div className="h-3 w-24 rounded-full bg-secondary" />
          <div className="h-5 w-12 rounded-full bg-secondary" />
        </div>
        <div className="flex items-center gap-3">
          <div className="h-7 w-7 rounded-full bg-secondary" />
          <div className="h-4 w-24 rounded-full bg-secondary" />
          <div className="mx-auto h-6 w-16 rounded-lg bg-secondary" />
          <div className="h-4 w-24 rounded-full bg-secondary" />
          <div className="h-7 w-7 rounded-full bg-secondary" />
        </div>
      </div>
    </div>
  );
}

function LiveListPage() {
  const { t } = useTranslation();
  const [openFixture, setOpenFixture] = useState<LiveFixture | null>(null);
  const [tab, setTab] = useState<StatusTab>("all");
  // "all" = every league; otherwise a POPULAR_LEAGUES id.
  const [selectedLeague, setSelectedLeague] = useState<string>("all");
  // Free-text search over team names (case/accent-insensitive).
  const [searchQuery, setSearchQuery] = useState("");

  const { data, isLoading, isFetching, refetch, dataUpdatedAt } = useInplayFeed();
  const { data: systemStatus } = useSystemStatus();
  const { favorites } = useFavorites();
  const favTeams = favorites.teams;

  const quotaExhausted = data?.quotaExhausted === true || systemStatus?.status === "quota";

  // Countdown to the next automatic 60s poll.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);
  const nextIn = dataUpdatedAt
    ? Math.max(0, Math.ceil((dataUpdatedAt + LIVE_POLL_MS - now) / 1000))
    : Math.ceil(LIVE_POLL_MS / 1000);

  const allFixtures = useMemo(() => data?.fixtures ?? [], [data]);

  // Live-count on the header + used for the badge side effect.
  const liveCount = useMemo(
    () => allFixtures.filter((f) => f.status === "live" || f.status === "halftime").length,
    [allFixtures],
  );

  // The fixed 15-league bar with per-league live counts + real logos.
  const leagueChips = useMemo(() => {
    const byId = new Map<string, { count: number; logo?: string }>();
    for (const f of allFixtures) {
      // First-match-wins: each fixture counts under at most ONE chip (in list
      // order) so overlapping patterns never double-count a match.
      const chip = POPULAR_LEAGUES.find((c) => matchesLeague(f, c));
      if (chip) {
        const entry = byId.get(chip.id) ?? { count: 0 };
        entry.count += 1;
        if (!entry.logo && f.leagueLogo) entry.logo = f.leagueLogo;
        byId.set(chip.id, entry);
      }
    }
    return POPULAR_LEAGUES.map((chip) => {
      const e = byId.get(chip.id) ?? { count: 0 };
      return { id: chip.id, name: chip.name, count: e.count, logo: e.logo };
    });
  }, [allFixtures]);

  // Per-tab live counts (over the whole feed, unaffected by league/search).
  const tabCounts = useMemo(() => {
    const count = (tb: StatusTab) => allFixtures.filter((f) => matchesTab(f, tb, favTeams)).length;
    return {
      all: allFixtures.length,
      "first-half": count("first-half"),
      halftime: count("halftime"),
      "second-half": count("second-half"),
      favorites: count("favorites"),
    };
  }, [allFixtures, favTeams]);

  // Single client-side filter pass: status tab AND league AND team search.
  const filtered = useMemo(() => {
    const q = normalizeLeague(searchQuery.trim());
    return allFixtures.filter((f) => {
      if (!matchesTab(f, tab, favTeams)) return false;
      if (selectedLeague !== "all") {
        // Consistent with the count loop's first-match-wins assignment: only
        // show fixtures whose assigned (first-match) chip is the selected one.
        const assigned = POPULAR_LEAGUES.find((c) => matchesLeague(f, c));
        if (!assigned || assigned.id !== selectedLeague) return false;
      }
      if (
        q &&
        !(
          normalizeLeague(f.home.name).includes(q) ||
          normalizeLeague(f.away.name).includes(q)
        )
      ) {
        return false;
      }
      return true;
    });
  }, [allFixtures, tab, selectedLeague, searchQuery, favTeams]);

  useEffect(() => {
    if (liveCount > 0) bumpBadgeStat("liveMatchesViewed", liveCount);
  }, [liveCount]);

  const showEmpty = !isLoading && filtered.length === 0;
  const emptyIsQuota = quotaExhausted && allFixtures.length === 0;

  return (
    <AppShell>
      <div className="space-y-3">
        {/* Slim header: title + live count + manual refresh */}
        <section className="flex items-center justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-lg font-extrabold">
              <Radio className="h-5 w-5 text-primary" />
              {t("liveCenter.title", { defaultValue: "Live Matches" })}
            </h1>
            <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <span
                className={`h-1.5 w-1.5 rounded-full ${isFetching ? "animate-ping bg-primary" : "bg-primary/60"}`}
              />
              {isFetching
                ? t("liveCenter.updating", { defaultValue: "Updating…" })
                : t("liveCenter.autoRefresh", {
                    defaultValue: "Auto-refresh in {{seconds}}s",
                    seconds: nextIn,
                  })}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-primary/15 px-3 py-1 text-xs font-extrabold tabular-nums text-primary">
              {t("liveCenter.liveCount", { defaultValue: "{{count}} LIVE", count: liveCount })}
            </span>
            <button
              onClick={() => {
                void refetch();
                toast.success(t("liveCenter.refreshed", { defaultValue: "Scores refreshed" }));
              }}
              className="grid h-10 w-10 place-items-center rounded-full bg-secondary text-foreground"
              aria-label={t("liveCenter.refresh", { defaultValue: "Refresh" })}
            >
              <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
            </button>
          </div>
        </section>

        {/* 1. Search bar (top, minimalist) */}
        <label className="flex items-center gap-2 rounded-full bg-secondary px-3.5 py-2.5 text-sm">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t("liveCenter.searchTeams", { defaultValue: "Search teams…" })}
            className="w-full bg-transparent outline-none placeholder:text-muted-foreground"
            aria-label={t("liveCenter.searchTeams", { defaultValue: "Search teams…" })}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="shrink-0 rounded-full p-0.5 text-muted-foreground transition-colors hover:text-foreground"
              aria-label={t("liveCenter.searchClear", { defaultValue: "Clear search" })}
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </label>

        {/* 2. League horizontal bar — "All live" + fixed 15 leagues */}
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar text-xs font-semibold">
          <button
            onClick={() => setSelectedLeague("all")}
            className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 transition-colors ${
              selectedLeague === "all" ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
            }`}
          >
            {t("liveCenter.allLive", { defaultValue: "Tüm Canlılar" })}
            <span className="grid h-4 min-w-4 place-items-center rounded-full bg-black/20 px-1 tabular-nums">
              {tabCounts.all}
            </span>
          </button>
          {leagueChips.map((chip) => {
            const active = selectedLeague === chip.id;
            const muted = chip.count === 0;
            return (
              <button
                key={chip.id}
                onClick={() => setSelectedLeague(active ? "all" : chip.id)}
                className={`flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1.5 transition-colors ${
                  active
                    ? "bg-primary text-primary-foreground"
                    : muted
                      ? "bg-secondary/40 text-muted-foreground/70"
                      : "bg-secondary text-muted-foreground"
                }`}
              >
                {chip.logo ? (
                  <img src={chip.logo} alt="" loading="lazy" className="h-4 w-4 shrink-0 rounded-full object-contain" />
                ) : (
                  <Shield className={`h-4 w-4 shrink-0 ${muted ? "opacity-40" : ""}`} aria-hidden />
                )}
                <span className={muted ? "line-through decoration-muted-foreground/40" : ""}>{chip.name}</span>
                <span
                  className={`grid h-4 min-w-4 place-items-center rounded-full px-1 tabular-nums ${
                    active ? "bg-black/20" : muted ? "bg-secondary" : "bg-primary/20 text-primary"
                  }`}
                >
                  {chip.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* 3. Status tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar text-xs font-semibold">
          {(
            [
              ["all", t("liveCenter.tabAll", { defaultValue: "Tümü" }), tabCounts.all],
              ["first-half", t("liveCenter.tabFirstHalf", { defaultValue: "İlk Yarı" }), tabCounts["first-half"]],
              ["halftime", t("liveCenter.tabHalftime", { defaultValue: "Devre Arası" }), tabCounts.halftime],
              ["second-half", t("liveCenter.tabSecondHalf", { defaultValue: "İkinci Yarı" }), tabCounts["second-half"]],
              ["favorites", t("liveCenter.tabFavorites", { defaultValue: "Favoriler" }), tabCounts.favorites],
            ] as [StatusTab, string, number][]
          ).map(([key, label, count]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 transition-colors ${
                tab === key ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
              }`}
            >
              {label}
              <span className="grid h-4 min-w-4 place-items-center rounded-full bg-black/20 px-1 tabular-nums">
                {count}
              </span>
            </button>
          ))}
        </div>

        {/* Loading skeletons */}
        {isLoading && (
          <div className="space-y-3" aria-busy="true" aria-label={t("liveCenter.loading", { defaultValue: "Loading" })}>
            {[0, 1, 2, 3].map((i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        )}

        {/* Empty state */}
        {showEmpty && (
          <div className="rounded-3xl border border-dashed border-border p-8 text-center">
            {emptyIsQuota ? (
              <QuotaStateCard className="border-0 shadow-none" />
            ) : (
              <div className="space-y-2">
                <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-secondary/60">
                  <Radio className="h-6 w-6 text-muted-foreground" aria-hidden />
                </div>
                <h3 className="text-base font-extrabold">
                  {t("liveCenter.emptyTitle", { defaultValue: "No live matches right now" })}
                </h3>
                <p className="mx-auto max-w-sm text-sm text-muted-foreground">
                  {t("liveCenter.emptyBody", {
                    defaultValue: "There are no in-play matches in this view right now — try another filter or check back soon.",
                  })}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Match cards */}
        {!isLoading && (
          <div className="space-y-3">
            {filtered.map((fixture) => (
              <MatchCard key={fixture.id} fixture={fixture} onOpen={setOpenFixture} t={t} />
            ))}
          </div>
        )}
      </div>

      <MatchDetailModal fixture={openFixture} onOpenChange={(open) => !open && setOpenFixture(null)} />
    </AppShell>
  );
}
