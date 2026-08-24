import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Trophy, ChevronRight, TrendingUp, Shield } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { getStandings, getFixturesByLeague, type Standings, type Fixture } from "@/lib/football-data.functions";

export const Route = createFileRoute("/competitions")({
  head: () => ({
    meta: [
      { title: "Competitions — FootCard Standings & Fixtures" },
      { name: "description", content: "Football league standings, fixtures and live scores from top competitions around the world." },
      { property: "og:title", content: "Competitions — FootCard" },
      { property: "og:description", content: "League tables, fixtures and live scores." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CompetitionsPage,
});

const leagues = [
  { id: 39, name: "Premier League", country: "🏴󠁧󠁢󠁥󠁮󠁧󠁿" },
  { id: 140, name: "La Liga", country: "🇪🇸" },
  { id: 78, name: "Bundesliga", country: "🇩🇪" },
  { id: 135, name: "Serie A", country: "🇮🇹" },
  { id: 61, name: "Ligue 1", country: "🇫🇷" },
  { id: 203, name: "Süper Lig", country: "🇹🇷" },
  { id: 2, name: "Champions League", country: "🇪🇺" },
];

function CompetitionsPage() {
  const { t } = useTranslation();
  const [selectedLeague, setSelectedLeague] = useState(leagues[0]!.id);
  const [tab, setTab] = useState<"standings" | "fixtures">("standings");
  const fetchStandings = useServerFn(getStandings);
  const fetchFixtures = useServerFn(getFixturesByLeague);

  const { data: standings, isLoading: standingsLoading } = useQuery({
    queryKey: ["standings", selectedLeague],
    queryFn: () => fetchStandings({ data: { leagueId: selectedLeague } }),
  });

  const { data: fixtures, isLoading: fixturesLoading } = useQuery({
    queryKey: ["fixtures-league", selectedLeague],
    queryFn: () => fetchFixtures({ data: { leagueId: selectedLeague } }),
  });

  return (
    <AppShell>
      <div className="space-y-4">
        <section className="card-surface rounded-3xl p-4">
          <h1 className="flex items-center gap-2 text-lg font-extrabold">
            <Trophy className="h-5 w-5 text-primary" />
            {t("nav.competitions")}
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">
            {t("competitions.subtitle", { defaultValue: "League tables and fixtures from top competitions." })}
          </p>
        </section>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {leagues.map((l) => (
            <button
              key={l.id}
              onClick={() => setSelectedLeague(l.id)}
              className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                selectedLeague === l.id
                  ? "border-primary/50 bg-primary/15 text-primary"
                  : "border-border bg-secondary/40 text-muted-foreground"
              }`}
            >
              <span className="mr-1">{l.country}</span>
              {l.name}
            </button>
          ))}
        </div>

        <div className="flex rounded-full border border-border bg-secondary/50 p-1 text-xs font-semibold">
          {(["standings", "fixtures"] as const).map((k) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              className={`flex-1 rounded-full py-1.5 transition-colors ${
                tab === k ? "bg-primary text-primary-foreground" : "text-muted-foreground"
              }`}
            >
              {t(`competitions.${k}`, { defaultValue: k })}
            </button>
          ))}
        </div>

        {tab === "standings" && (
          <section className="card-surface rounded-3xl p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
                {standings?.leagueName ?? "—"}
              </h2>
              {standings?.source === "mock" && (
                <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-bold text-accent">
                  {t("liveCenter.mockNote", { defaultValue: "Demo data" })}
                </span>
              )}
            </div>
            {standingsLoading ? (
              <div className="space-y-2">
                {[0, 1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-10 animate-pulse rounded-xl bg-secondary/50" />
                ))}
              </div>
            ) : standings?.rows.length ? (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left text-muted-foreground">
                      <th className="pb-2 pl-2">#</th>
                      <th className="pb-2">{t("competitions.team", { defaultValue: "Team" })}</th>
                      <th className="pb-2 text-right">P</th>
                      <th className="pb-2 text-right">W</th>
                      <th className="pb-2 text-right">D</th>
                      <th className="pb-2 text-right">L</th>
                      <th className="pb-2 text-right">GD</th>
                      <th className="pb-2 pr-2 text-right">Pts</th>
                    </tr>
                  </thead>
                  <tbody>
                    {standings?.rows.map((row) => (
                      <tr key={row.team.id} className="border-t border-border/50">
                        <td className="py-2 pl-2 font-extrabold text-muted-foreground">{row.rank}</td>
                        <td className="py-2">
                          <div className="flex items-center gap-2">
                            {row.team.logo ? (
                              <img src={row.team.logo} alt="" className="h-5 w-5 object-contain" loading="lazy" />
                            ) : (
                              <Shield className="h-4 w-4 text-muted-foreground" />
                            )}
                            <span className="font-semibold">{row.team.name}</span>
                          </div>
                        </td>
                        <td className="py-2 text-right tabular-nums text-muted-foreground">{row.played}</td>
                        <td className="py-2 text-right tabular-nums">{row.wins}</td>
                        <td className="py-2 text-right tabular-nums">{row.draws}</td>
                        <td className="py-2 text-right tabular-nums">{row.losses}</td>
                        <td className="py-2 text-right tabular-nums">{row.goalDiff > 0 ? `+${row.goalDiff}` : row.goalDiff}</td>
                        <td className="py-2 pr-2 text-right font-extrabold tabular-nums text-accent">{row.points}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-border bg-secondary/20 p-6 text-center">
                <Trophy className="mx-auto h-8 w-8 text-muted-foreground" />
                <p className="mt-2 text-sm font-semibold">
                  {t("competitions.noStandings", { defaultValue: "No standings available" })}
                </p>
                <p className="mx-auto mt-1 max-w-sm text-xs text-muted-foreground">
                  {t("competitions.noStandingsHint", {
                    defaultValue: "Real standings aren't available for this competition right now. No data is shown rather than making it up.",
                  })}
                </p>
              </div>
            )}
          </section>
        )}

        {tab === "fixtures" && (
          <section className="card-surface rounded-3xl p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
                {t("competitions.fixtures", { defaultValue: "Fixtures" })}
              </h2>
              {fixtures?.[0]?.source === "mock" && (
                <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-bold text-accent">
                  {t("liveCenter.mockNote", { defaultValue: "Demo data" })}
                </span>
              )}
            </div>
            {fixturesLoading ? (
              <div className="space-y-2">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="h-14 animate-pulse rounded-xl bg-secondary/50" />
                ))}
              </div>
            ) : (
              <ul className="space-y-2">
                {fixtures?.map((f) => (
                  <li key={f.id}>
                    <Link
                      to="/live/$fixtureId"
                      params={{ fixtureId: String(f.id) }}
                      className="flex items-center justify-between rounded-xl bg-secondary/40 px-3 py-3 transition-colors hover:bg-secondary/70"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold">{f.home.name} vs {f.away.name}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {new Date(f.date).toLocaleDateString(undefined, { weekday: "short", hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            f.status === "live" ? "bg-primary/20 text-primary" : "bg-secondary text-muted-foreground"
                          }`}
                        >
                          {f.status === "live" ? `${f.minute}'` : f.status === "finished" ? "FT" : "SCH"}
                        </span>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
      </div>
    </AppShell>
  );
}
