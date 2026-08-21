import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Radio, RefreshCw } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { CardDetailModal } from "@/components/analytics/CardDetailModal";
import { getLiveFeed } from "@/lib/live.functions";
import { players } from "@/data/football";
import { bumpBadgeStat } from "@/lib/badges";
import type { LiveFixture } from "@/lib/live";

export const Route = createFileRoute("/live")({
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
  component: LivePage,
});

function statusLabel(fixture: LiveFixture, t: (k: string, o: { defaultValue: string }) => string) {
  if (fixture.status === "live") return `${fixture.minute}'`;
  if (fixture.status === "halftime") return t("liveCenter.halftime", { defaultValue: "HT" });
  if (fixture.status === "finished") return t("liveCenter.finished", { defaultValue: "FT" });
  return fixture.kickoff;
}

function LivePage() {
  const { t } = useTranslation();
  const fetchFeed = useServerFn(getLiveFeed);
  const [openId, setOpenId] = useState<string | null>(null);

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["live-feed"],
    queryFn: () => fetchFeed(),
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  const fixtures = useMemo(() => data?.fixtures ?? [], [data]);
  const liveCount = fixtures.filter((f) => f.status === "live" || f.status === "halftime").length;

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

        {isLoading && (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-32 animate-pulse rounded-3xl bg-secondary/50" />
            ))}
          </div>
        )}

        {fixtures.map((fixture) => (
          <article key={fixture.id} className="card-surface rounded-3xl p-4">
            <header className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{fixture.league}</span>
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
            </header>

            <div className="mt-3 flex items-center justify-between gap-3">
              <div className="flex min-w-0 flex-1 items-center gap-2">
                <span className="text-xl">{fixture.home.badge}</span>
                <span className="truncate text-sm font-bold">{fixture.home.name}</span>
              </div>
              <span className="text-xl font-extrabold tabular-nums">
                {fixture.home.score} - {fixture.away.score}
              </span>
              <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
                <span className="truncate text-sm font-bold">{fixture.away.name}</span>
                <span className="text-xl">{fixture.away.badge}</span>
              </div>
            </div>

            {fixture.performers.length > 0 && (
              <ul className="mt-3 space-y-1.5 border-t border-border pt-3">
                {fixture.performers.map((p, i) => (
                  <li key={`${fixture.id}-${p.playerId ?? i}`}>
                    <button
                      onClick={() => p.playerId && setOpenId(p.playerId)}
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

        {data?.source === "mock" && (
          <p className="pb-2 text-center text-[11px] text-muted-foreground">
            {t("liveCenter.mockNote", { defaultValue: "Demo feed — connect a live data key for real fixtures." })}
          </p>
        )}
      </div>

      <CardDetailModal card={openCard} onOpenChange={(open) => !open && setOpenId(null)} />
    </AppShell>
  );
}
