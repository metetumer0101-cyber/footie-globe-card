import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Radio, Shield, Users } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { getMatchDetails } from "@/lib/football-data.functions";
import { useLiveFeed } from "@/hooks/use-live-feed";

/** API-Football serves player headshots from a stable CDN path. */
function playerPhoto(id: number | undefined) {
  return id ? `https://media.api-sports.io/football/players/${id}.png` : null;
}

export const Route = createFileRoute("/live/$fixtureId")({
  head: ({ params }) => ({
    meta: [
      { title: `Match Detail — FootCard #${params.fixtureId}` },
      { name: "description", content: "Live match events, statistics and lineups on FootCard." },
      { property: "og:title", content: `Match Detail — FootCard #${params.fixtureId}` },
      { property: "og:description", content: "Live match events, statistics and lineups." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MatchDetailPage,
});

function MatchDetailPage() {
  const { t } = useTranslation();
  const { fixtureId } = Route.useParams();
  const id = Number(fixtureId);
  const fetchDetails = useServerFn(getMatchDetails);
  const { data: feed } = useLiveFeed();
  const [tab, setTab] = useState<"events" | "stats" | "lineups">("events");

  const fixture = feed?.fixtures.find((f) => f.id === fixtureId);

  const { data: details, isLoading } = useQuery({
    queryKey: ["match-details", id],
    queryFn: () => fetchDetails({ data: { fixtureId: id } }),
    enabled: !Number.isNaN(id),
    refetchInterval: 30_000,
  });

  const homeName = fixture?.home.name ?? t("liveCenter.home", { defaultValue: "Home" });
  const awayName = fixture?.away.name ?? t("liveCenter.away", { defaultValue: "Away" });
  const homeScore = fixture?.home.score ?? 0;
  const awayScore = fixture?.away.score ?? 0;
  const status = fixture?.status ?? "scheduled";
  const minute = fixture?.minute ?? 0;

  const statusText =
    status === "live" ? `${minute}'` : status === "halftime" ? t("liveCenter.halftime", { defaultValue: "HT" }) : status === "finished" ? t("liveCenter.finished", { defaultValue: "FT" }) : fixture?.kickoff ?? "—";

  return (
    <AppShell>
      <div className="space-y-4">
        <Link
          to="/live"
          className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {t("liveCenter.backToLive", { defaultValue: "Back to live matches" })}
        </Link>

        <section className="card-surface rounded-3xl p-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-primary">
            <Radio className="h-3.5 w-3.5" />
            {fixture?.league ?? t("liveCenter.title", { defaultValue: "Live Matches" })}
          </div>

          <div className="mt-4 flex items-center justify-between gap-3">
            <div className="flex min-w-0 flex-1 flex-col items-center gap-1.5 text-center">
              {fixture?.home.logo ? (
                <img
                  src={fixture.home.logo}
                  alt={homeName}
                  width={40}
                  height={40}
                  decoding="async"
                  className="h-10 w-10 object-contain"
                />
              ) : (
                <span className="text-3xl">{fixture?.home.badge ?? "⚽"}</span>
              )}
              <span className="w-full truncate text-sm font-bold">{homeName}</span>
            </div>
            <div className="shrink-0 text-center">
              <div className="text-3xl font-extrabold tabular-nums">
                {homeScore} - {awayScore}
              </div>
              <span
                className={`mt-1 inline-block rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                  status === "live" ? "bg-primary/20 text-primary" : "bg-secondary text-muted-foreground"
                }`}
              >
                {statusText}
              </span>
            </div>
            <div className="flex min-w-0 flex-1 flex-col items-center gap-1.5 text-center">
              {fixture?.away.logo ? (
                <img
                  src={fixture.away.logo}
                  alt={awayName}
                  width={40}
                  height={40}
                  decoding="async"
                  className="h-10 w-10 object-contain"
                />
              ) : (
                <span className="text-3xl">{fixture?.away.badge ?? "⚽"}</span>
              )}
              <span className="w-full truncate text-sm font-bold">{awayName}</span>
            </div>
          </div>
        </section>

        <div className="flex rounded-full border border-border bg-secondary/50 p-1 text-xs font-semibold">
          {(["events", "stats", "lineups"] as const).map((k) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              className={`flex-1 rounded-full py-1.5 transition-colors ${
                tab === k ? "bg-primary text-primary-foreground" : "text-muted-foreground"
              }`}
            >
              {t(`liveCenter.${k}`, { defaultValue: k })}
            </button>
          ))}
        </div>

        {isLoading && (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-16 animate-pulse rounded-2xl bg-secondary/50" />
            ))}
          </div>
        )}

        {!isLoading && tab === "events" && (
          <section className="card-surface rounded-3xl p-4">
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-muted-foreground">
              {t("liveCenter.events", { defaultValue: "Match Events" })}
            </h2>
            {details?.events.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                {t("liveCenter.noEvents", { defaultValue: "No events yet." })}
              </p>
            ) : (
              <ol className="space-y-2">
                {details?.events.map((e, i) => (
                  <li key={i} className="flex items-center gap-3 rounded-xl bg-secondary/40 px-3 py-2 text-xs">
                    <span className="w-10 shrink-0 font-extrabold tabular-nums text-muted-foreground">
                      {e.elapsed}{e.extraTime ? `+${e.extraTime}` : ""}{"'"}
                    </span>
                    {playerPhoto(e.player.id) ? (
                      <img
                        src={playerPhoto(e.player.id)!}
                        alt={e.player.name}
                        loading="lazy"
                        className="h-8 w-8 shrink-0 rounded-full bg-secondary object-cover"
                      />
                    ) : null}
                    <span className="shrink-0">
                      {e.type === "Goal" ? "⚽" : e.type === "Card" ? (e.detail.includes("yellow") ? "🟨" : "🟥") : e.type === "Subst" ? "🔄" : "•"}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{e.player.name}</p>
                      <p className="truncate text-muted-foreground">{e.team.name} · {e.detail}</p>
                    </div>
                    {e.assist?.name && (
                      <span className="hidden shrink-0 text-muted-foreground sm:inline">🅰 {e.assist.name}</span>
                    )}
                  </li>
                ))}
              </ol>
            )}
          </section>
        )}

        {!isLoading && tab === "stats" && (
          <section className="card-surface rounded-3xl p-4">
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-muted-foreground">
              {t("liveCenter.stats", { defaultValue: "Statistics" })}
            </h2>
            {details?.stats.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                {t("liveCenter.noStats", { defaultValue: "No statistics available." })}
              </p>
            ) : (
              <div className="space-y-3">
                {details?.stats.map((s, i) => {
                  const homeNum = Number.parseFloat(s.home) || 0;
                  const awayNum = Number.parseFloat(s.away) || 0;
                  const total = homeNum + awayNum || 1;
                  const homePct = Math.round((homeNum / total) * 100);
                  return (
                    <div key={i}>
                      <div className="mb-1 flex items-center justify-between text-xs font-semibold">
                        <span className="w-8 text-right tabular-nums">{s.home}</span>
                        <span className="flex-1 text-center text-muted-foreground">{s.type}</span>
                        <span className="w-8 text-left tabular-nums">{s.away}</span>
                      </div>
                      <div className="flex h-2 overflow-hidden rounded-full bg-secondary/70">
                        <div className="h-full bg-primary transition-all" style={{ width: `${homePct}%` }} />
                        <div className="h-full bg-accent transition-all" style={{ width: `${100 - homePct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {!isLoading && tab === "lineups" && (
          <section className="card-surface rounded-3xl p-4">
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-muted-foreground">
              {t("liveCenter.lineups", { defaultValue: "Lineups" })}
            </h2>
            {details?.lineups.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                {t("liveCenter.noLineups", { defaultValue: "No lineups available." })}
              </p>
            ) : (
              <div className="space-y-4">
                {details?.lineups.map((l) => (
                  <div key={l.team.id} className="rounded-2xl border border-border bg-secondary/30 p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4 text-primary" />
                        <span className="text-sm font-bold">{l.team.name}</span>
                      </div>
                      <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold text-primary">
                        {l.formation}
                      </span>
                    </div>
                    <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      {t("liveCenter.startXI", { defaultValue: "Starting XI" })}
                    </p>
                    <ul className="mb-3 space-y-1">
                      {l.startXI.map((p) => (
                        <li key={p.id} className="flex items-center gap-2 text-xs">
                          <span className="w-5 text-right font-bold text-muted-foreground">{p.number}</span>
                          {playerPhoto(p.id) ? (
                            <img
                              src={playerPhoto(p.id)!}
                              alt={p.name}
                              loading="lazy"
                              className="h-7 w-7 shrink-0 rounded-full bg-secondary object-cover"
                            />
                          ) : null}
                          <span className="min-w-0 flex-1 truncate">{p.name}</span>
                          <span className="text-[10px] text-muted-foreground">{p.pos}</span>
                        </li>
                      ))}
                    </ul>
                    <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      {t("liveCenter.bench", { defaultValue: "Bench" })}
                    </p>
                    <ul className="space-y-1">
                      {l.substitutes.slice(0, 7).map((p) => (
                        <li key={p.id} className="flex items-center gap-2 text-xs text-muted-foreground">
                          {playerPhoto(p.id) ? (
                            <img
                              src={playerPhoto(p.id)!}
                              alt={p.name}
                              loading="lazy"
                              className="h-6 w-6 shrink-0 rounded-full bg-secondary object-cover"
                            />
                          ) : (
                            <Users className="h-3 w-3" />
                          )}
                          <span className="min-w-0 flex-1 truncate">{p.name}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </div>
    </AppShell>
  );
}
