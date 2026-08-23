import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Radio, RefreshCw, ChevronRight } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { CardDetailModal } from "@/components/analytics/CardDetailModal";
import { MatchDetailModal } from "@/components/live/MatchDetailModal";
import { QuotaStateCard } from "@/components/home/QuotaStateCard";
import { useLiveFeed, LIVE_POLL_MS } from "@/hooks/use-live-feed";
import { useSystemStatus } from "@/hooks/use-system-status";
import { players } from "@/data/football";
import { bumpBadgeStat } from "@/lib/badges";
import type { LiveFixture } from "@/lib/live";
import { groupFixturesByLeague, sortFixtures } from "@/lib/live";

export const Route = createFileRoute("/live/")({
  head: () => ({
    meta: [
      { title: "Live Matches — FootCard Scores & Player Ratings" },
      {
        name: "description",
        content:
          "Today's football fixtures with live scores, match minute timers and live player performance ratings on FootCard.",
      },
      { property: "og:title", content: "Live Matches — FootCard" },
      { property: "og:description", content: "Live scores, match minutes and player ratings, updated in real time." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LiveListPage,
});

function statusLabel(fixture: LiveFixture, t: (k: string, o: { defaultValue: string }) => string) {
  if (fixture.status === "live") return `${fixture.minute}'`;
  if (fixture.status === "halftime") return t("liveCenter.halftime", { defaultValue: "HT" });
  if (fixture.status === "finished") return t("liveCenter.finished", { defaultValue: "FT" });
  return fixture.kickoff;
}

function LiveListPage() {
  const { t } = useTranslation();
  const [openId, setOpenId] = useState<string | null>(null);
  const [openFixture, setOpenFixture] = useState<LiveFixture | null>(null);
  const [filter, setFilter] = useState<"all" | "live" | "finished" | "scheduled">("all");

  const { data, isLoading, isFetching, refetch, dataUpdatedAt } = useLiveFeed();
  const { data: systemStatus } = useSystemStatus();
  // Quota flag comes from the live feed itself (synchronous) so the empty-state
  // card shows immediately when quota is exhausted; system status is a backup.
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

  const allFixtures = useMemo(() => sortFixtures(data?.fixtures ?? []), [data]);
  const liveCount = allFixtures.filter((f) => f.status === "live" || f.status === "halftime").length;
  const finishedCount = allFixtures.filter((f) => f.status === "finished").length;
  const fixtures = useMemo(
    () =>
      filter === "all"
        ? allFixtures
        : allFixtures.filter((f) =>
            filter === "live"
              ? f.status === "live" || f.status === "halftime"
              : f.status === filter,
          ),
    [allFixtures, filter],
  );

  // Group under league headings, ordered by worldwide popularity (client-side,
  // over the already-cached serverFn payload — no extra API calls).
  const groups = useMemo(() => groupFixturesByLeague(fixtures), [fixtures]);

  useEffect(() => {
    if (liveCount > 0) bumpBadgeStat("liveMatchesViewed", liveCount);
  }, [liveCount]);

  const openCard = players.find((p) => p.id === openId) ?? null;

  return (
    <AppShell>
      <div className="space-y-4">
        <section className="card-surface flex items-center justify-between rounded-3xl p-4">
          <div>
            <h1 className="flex items-center gap-2 text-lg font-extrabold">
              <Radio className="h-5 w-5 text-primary" />
              {t("liveCenter.title", { defaultValue: "Live Matches" })}
            </h1>
            <p className="text-xs text-muted-foreground">
              {t("liveCenter.subtitle", {
                defaultValue: "{{count}} match(es) in play · today's fixtures",
                count: liveCount,
              })}
            </p>
            <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
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
        </section>

        <div className="flex gap-2 overflow-x-auto pb-1 text-xs font-semibold">
          {([
            ["all", t("liveCenter.filterAll", { defaultValue: "All" }), allFixtures.length],
            ["live", t("liveCenter.filterLive", { defaultValue: "Live" }), liveCount],
            ["finished", t("liveCenter.filterFinished", { defaultValue: "Finished" }), finishedCount],
            [
              "scheduled",
              t("liveCenter.filterUpcoming", { defaultValue: "Upcoming" }),
              allFixtures.length - liveCount - finishedCount,
            ],
          ] as const).map(([key, label, count]) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`shrink-0 rounded-full px-3 py-1.5 transition-colors ${
                filter === key ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
              }`}
            >
              {label} <span className="tabular-nums opacity-70">{count}</span>
            </button>
          ))}
        </div>

        {isLoading && (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-32 animate-pulse rounded-3xl bg-secondary/50" />
            ))}
          </div>
        )}

        {groups.length === 0 && !isLoading && (
          <div className="rounded-3xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            {quotaExhausted ? (
              <QuotaStateCard />
            ) : (
              t("liveCenter.empty", {
                defaultValue: "No matches in this view right now — try another filter.",
              })
            )}
          </div>
        )}

        {groups.map((group) => (
          <div key={group.key} className="space-y-3">
            <h2 className="flex items-center gap-2 px-1 pt-1 text-sm font-extrabold uppercase tracking-wide text-muted-foreground">
              <span className="h-3 w-1 rounded-full bg-primary" />
              {group.league}
              <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-bold normal-case text-muted-foreground">
                {group.fixtures.length}
              </span>
            </h2>
            {group.fixtures.map((fixture) => (
          <article
            key={fixture.id}
            onClick={() => setOpenFixture(fixture)}
            className="card-surface cursor-pointer rounded-3xl p-4 transition-colors hover:bg-secondary/40"
          >
            <header className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{fixture.league}</span>
              <div className="flex items-center gap-2">
                <span
                  className={`rounded-full px-2 py-0.5 font-bold ${
                    fixture.status === "live"
                      ? "bg-primary/20 text-primary"
                      : fixture.status === "halftime"
                        ? "bg-accent/20 text-accent"
                        : "bg-secondary text-muted-foreground"
                  }`}
                >
                  {statusLabel(fixture, t)}
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpenFixture(fixture);
                  }}
                  className="rounded-full bg-secondary p-1 text-muted-foreground transition-colors hover:text-foreground"
                  aria-label={t("liveCenter.details", { defaultValue: "Match details" })}
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </header>

            <div className="mt-3 flex items-center justify-between gap-3">
              <div className="flex min-w-0 flex-1 items-center gap-2">
                {fixture.home.logo ? (
                  <img
                    src={fixture.home.logo}
                    alt={`${fixture.home.name} logo`}
                    loading="lazy"
                    className="h-6 w-6 shrink-0 object-contain"
                  />
                ) : (
                  <span className="text-xl">{fixture.home.badge}</span>
                )}
                <span className="truncate text-sm font-bold">{fixture.home.name}</span>
              </div>
              <span className="text-xl font-extrabold tabular-nums">
                {fixture.home.score} - {fixture.away.score}
              </span>
              <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
                <span className="truncate text-sm font-bold">{fixture.away.name}</span>
                {fixture.away.logo ? (
                  <img
                    src={fixture.away.logo}
                    alt={`${fixture.away.name} logo`}
                    loading="lazy"
                    className="h-6 w-6 shrink-0 object-contain"
                  />
                ) : (
                  <span className="text-xl">{fixture.away.badge}</span>
                )}
              </div>
            </div>

            {fixture.performers.length > 0 && (
              <ul className="mt-3 space-y-1.5 border-t border-border pt-3">
                {fixture.performers.map((p, i) => (
                  <li key={`${fixture.id}-${p.playerId ?? i}`}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (p.playerId) setOpenId(p.playerId);
                      }}
                      className="flex w-full items-center justify-between rounded-xl px-2 py-1.5 text-left text-xs transition-colors hover:bg-secondary/60"
                    >
                      <span className="min-w-0 truncate">
                        <span className="font-semibold">{p.name}</span>{" "}
                        <span className="text-muted-foreground">· {p.team}</span>
                      </span>
                      <span className="ml-2 flex shrink-0 items-center gap-2">
                        {p.goals > 0 && <span className="text-accent">⚽ {p.goals}</span>}
                        {p.assists > 0 && <span className="text-muted-foreground">🅰 {p.assists}</span>}
                        <span
                          className={`rounded-md px-1.5 py-0.5 font-bold ${
                            p.rating >= 8
                              ? "bg-primary/20 text-primary"
                              : p.rating >= 7
                                ? "bg-accent/20 text-accent"
                                : "bg-secondary text-muted-foreground"
                          }`}
                        >
                          {p.rating.toFixed(1)}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </article>
            ))}
          </div>
        ))}

        {data?.source === "mock" && (
          <p className="pb-2 text-center text-[11px] text-muted-foreground">
            {t("liveCenter.mockNote", { defaultValue: "Demo feed — connect a live data key for real fixtures." })}
          </p>
        )}
      </div>

      <CardDetailModal card={openCard} onOpenChange={(open) => !open && setOpenId(null)} />
      <MatchDetailModal fixture={openFixture} onOpenChange={(open) => !open && setOpenFixture(null)} />
    </AppShell>
  );
}
