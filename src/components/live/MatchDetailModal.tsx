import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ExternalLink, Radio, Shield, Users } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { QuotaStateCard } from "@/components/home/QuotaStateCard";
import { useSystemStatus } from "@/hooks/use-system-status";
import { getMatchDetails } from "@/lib/football-data.functions";
import type { LiveFixture } from "@/lib/live";

/** SportMonks serves player headshots from its CDN (id-based image_path). */
function playerPhoto(id: number | undefined) {
  return id ? `https://cdn.sportmonks.com/images/soccer/players/${id}/${id}.png` : null;
}

type DetailTab = "events" | "stats" | "lineups";

function statusText(fixture: LiveFixture, t: (k: string, o: { defaultValue: string }) => string): string {
  if (fixture.status === "live") return `${fixture.minute}'`;
  if (fixture.status === "halftime") return t("liveCenter.halftime", { defaultValue: "HT" });
  if (fixture.status === "finished") return t("liveCenter.finished", { defaultValue: "FT" });
  return fixture.kickoff;
}

/**
 * Match-detail modal for the Live tab. Opens when a fixture card is clicked and
 * shows Lineups / Statistics / Timeline (events) side-by-side in a Radix
 * dialog, fetched live from API-Football via the server-side match-details
 * proxy. When the daily quota is exhausted an honest empty state is shown
 * instead of fabricated data.
 */
export function MatchDetailModal({
  fixture,
  onOpenChange,
}: {
  fixture: LiveFixture | null;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useTranslation();
  const [tab, setTab] = useState<DetailTab>("events");
  const id = fixture ? Number(fixture.id) : Number.NaN;
  const fetchDetails = useServerFn(getMatchDetails);
  const { data: systemStatus } = useSystemStatus();
  const quotaExhausted = systemStatus?.status === "quota";

  const { data: details, isLoading } = useQuery({
    queryKey: ["match-details", id],
    queryFn: () => fetchDetails({ data: { fixtureId: id } }),
    enabled: !!fixture && !Number.isNaN(id),
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
    staleTime: 30_000,
  });

  // Reset to the events tab whenever a different match is opened.
  useEffect(() => {
    setTab("events");
  }, [id]);

  const homeName = fixture?.home.name ?? t("liveCenter.home", { defaultValue: "Home" });
  const awayName = fixture?.away.name ?? t("liveCenter.away", { defaultValue: "Away" });

  return (
    <Dialog open={!!fixture} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] max-w-lg overflow-y-auto border-border bg-surface p-4">
        <DialogHeader className="text-start">
          <div className="flex items-center gap-1.5 text-xs font-bold text-primary">
            <Radio className="h-3.5 w-3.5" />
            <DialogDescription className="truncate text-xs text-primary">
              {fixture?.league ?? t("liveCenter.title", { defaultValue: "Live Matches" })}
            </DialogDescription>
          </div>
          <DialogTitle className="pt-1 text-lg">
            {homeName} vs {awayName}
          </DialogTitle>
        </DialogHeader>

        {quotaExhausted ? (
          <QuotaStateCard />
        ) : (
          <>
            <div className="card-surface flex items-center justify-center gap-4 rounded-2xl py-3 text-center">
              <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
                {fixture?.home.logo ? (
                  <img src={fixture.home.logo} alt={homeName} className="h-6 w-6 object-contain" />
                ) : (
                  <span className="text-xl">{fixture?.home.badge ?? "⚽"}</span>
                )}
                <span className="truncate text-sm font-bold">{homeName}</span>
              </div>
              <div className="shrink-0 text-center">
                <div className="text-xl font-extrabold tabular-nums">
                  {fixture?.home.score ?? 0} - {fixture?.away.score ?? 0}
                </div>
                {fixture && (
                  <span className="mt-0.5 inline-block rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
                    {statusText(fixture, t)}
                  </span>
                )}
              </div>
              <div className="flex min-w-0 flex-1 items-center gap-2">
                <span className="truncate text-sm font-bold">{awayName}</span>
                {fixture?.away.logo ? (
                  <img src={fixture.away.logo} alt={awayName} className="h-6 w-6 object-contain" />
                ) : (
                  <span className="text-xl">{fixture?.away.badge ?? "⚽"}</span>
                )}
              </div>
            </div>

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
              <section className="rounded-2xl border border-border bg-secondary/30 p-3">
                {details?.events.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">
                    {t("liveCenter.noEvents", { defaultValue: "No events yet." })}
                  </p>
                ) : (
                  <ol className="space-y-2">
                    {details?.events.map((e, i) => (
                      <li key={i} className="flex items-center gap-3 rounded-xl bg-secondary/40 px-3 py-2 text-xs">
                        <span className="w-10 shrink-0 font-extrabold tabular-nums text-muted-foreground">
                          {e.elapsed}
                          {e.extraTime ? `+${e.extraTime}` : ""}
                          {"'"}
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
                          {e.type === "Goal"
                            ? "⚽"
                            : e.type === "Card"
                              ? e.detail.includes("yellow")
                                ? "🟨"
                                : "🟥"
                              : e.type === "Subst"
                                ? "🔄"
                                : "•"}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-semibold">{e.player.name}</p>
                          <p className="truncate text-muted-foreground">
                            {e.team.name} · {e.detail}
                          </p>
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
              <section className="rounded-2xl border border-border bg-secondary/30 p-3">
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
              <section className="rounded-2xl border border-border bg-secondary/30 p-3">
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

            {fixture && !Number.isNaN(id) && (
              <Link
                to="/live/$fixtureId"
                params={{ fixtureId: fixture.id }}
                onClick={() => onOpenChange(false)}
                className="mt-1 flex items-center justify-center gap-1.5 rounded-xl bg-primary/15 px-3 py-2 text-xs font-bold text-primary transition-colors hover:bg-primary/25"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                {t("liveCenter.viewFullPage", { defaultValue: "Open full match page" })}
              </Link>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
