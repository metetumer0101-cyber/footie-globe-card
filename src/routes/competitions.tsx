import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Trophy, ChevronLeft, ChevronRight, Shield, CalendarDays } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import {
  getStandings,
  getFixturesByLeague,
  type Standings,
  type Fixture,
  type StandingRow,
} from "@/lib/football-data.functions";

export const Route = createFileRoute("/competitions")({
  head: () => ({
    meta: [
      { title: "Puan Durumu & Fikstür — FootCard" },
      {
        name: "description",
        content:
          "Football league standings, fixtures and match results from top competitions around the world on FootCard.",
      },
      { property: "og:title", content: "Standings & Fixtures — FootCard" },
      { property: "og:description", content: "League tables, fixtures and results." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CompetitionsPage,
});

/** SportMonks league ids (NOT legacy API-Football ids — SportMonks is the sole
 * provider now). UEFA club competitions are not accessible on the current plan. */
const leagues = [
  { id: 8, name: "Premier League", country: "🏴󠁧󠁢󠁥󠁮󠁧󠁿" },
  { id: 564, name: "La Liga", country: "🇪🇸" },
  { id: 82, name: "Bundesliga", country: "🇩🇪" },
  { id: 384, name: "Serie A", country: "🇮🇹" },
  { id: 301, name: "Ligue 1", country: "🇫🇷" },
  { id: 600, name: "Süper Lig", country: "🇹🇷" },
];

type ZoneKey = "cl" | "el" | "relegation";

/** Typical European qualification / relegation positions per league
 * (inclusive ranges). Used only to draw the Nesine-style colored zone lines. */
const LEAGUE_ZONES: Record<number, Partial<Record<ZoneKey, [number, number]>>> = {
  8: { cl: [1, 4], el: [5, 5], relegation: [18, 20] }, // Premier League (20)
  564: { cl: [1, 4], el: [5, 6], relegation: [18, 20] }, // La Liga (20)
  82: { cl: [1, 4], el: [5, 5], relegation: [16, 18] }, // Bundesliga (18)
  384: { cl: [1, 4], el: [5, 6], relegation: [18, 20] }, // Serie A (20)
  301: { cl: [1, 3], el: [4, 4], relegation: [16, 18] }, // Ligue 1 (18)
  600: { cl: [1, 2], el: [3, 3], relegation: [18, 20] }, // Süper Lig (20)
};

const ZONE_COLORS: Record<ZoneKey, string> = {
  cl: "#60a5fa", // Champions League — blue
  el: "#f59e0b", // Europa League — amber
  relegation: "#ef4444", // Relegation — red
};

/** Resolve which zone (if any) a rank falls into for a league. */
function zoneForRank(leagueId: number, rank: number): ZoneKey | undefined {
  const zones = LEAGUE_ZONES[leagueId] ?? {};
  for (const key of ["cl", "el", "relegation"] as const) {
    const range = zones[key];
    if (range && rank >= range[0] && rank <= range[1]) return key;
  }
  return undefined;
}

/** Form strip: one icon per result — W green, D gray, L red. */
function FormStrip({ form }: { form: string }) {
  const colors: Record<string, string> = {
    W: "#22c55e",
    D: "#71717a",
    L: "#ef4444",
  };
  const chars = (form || "").slice(-5).split("");
  if (!chars.length) return null;
  return (
    <span className="inline-flex items-center gap-1" aria-hidden>
      {chars.map((c, i) => (
        <span
          key={i}
          className="inline-block h-3.5 w-3.5 rounded-[4px] text-center text-[9px] font-extrabold leading-[14px] text-black/70"
          style={{ backgroundColor: colors[c] ?? "#71717a" }}
        >
          {c}
        </span>
      ))}
    </span>
  );
}

function TeamLogo({ logo, name }: { logo: string; name: string }) {
  if (logo) {
    return <img src={logo} alt="" loading="lazy" className="h-5 w-5 shrink-0 object-contain" />;
  }
  return (
    <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-secondary">
      <Shield className="h-3.5 w-3.5 text-muted-foreground" aria-label={name} />
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Date helpers (week navigation for fixtures)                         */
/* ------------------------------------------------------------------ */

function startOfWeek(d: Date): Date {
  const day = (d.getDay() + 6) % 7; // Monday = 0
  const r = new Date(d);
  r.setDate(d.getDate() - day);
  r.setHours(0, 0, 0, 0);
  return r;
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function isoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

type TFunc = (k: string, o: { defaultValue: string }) => string;

/** Human label for a date group header (Today / Tomorrow / weekday). */
function dateLabel(date: string, t: TFunc): string {
  const today = isoDate(new Date());
  const tomorrow = isoDate(addDays(new Date(), 1));
  if (date === today) return t("competitions.today", { defaultValue: "Today" });
  if (date === tomorrow) return t("competitions.tomorrow", { defaultValue: "Tomorrow" });
  const d = new Date(`${date}T00:00:00`);
  if (Number.isNaN(d.getTime())) return date;
  return d.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "short" });
}

function kickoffTime(fixture: Fixture): string {
  if (!fixture.kickoff) return "";
  const d = new Date(fixture.kickoff);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

function CompetitionsPage() {
  const { t } = useTranslation();
  const [selectedLeague, setSelectedLeague] = useState(leagues[0]!.id);
  const [tab, setTab] = useState<"standings" | "fixtures">("standings");
  const [weekOffset, setWeekOffset] = useState(0);
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

  const leagueName = leagues.find((l) => l.id === selectedLeague)?.name ?? "—";

  // Week window (Monday–Sunday) for the fixtures view.
  const week = useMemo(() => {
    const start = addDays(startOfWeek(new Date()), weekOffset * 7);
    const end = addDays(start, 6);
    return { start, end };
  }, [weekOffset]);

  const weekFixtures = useMemo(() => {
    const start = isoDate(week.start);
    const end = isoDate(week.end);
    return (fixtures ?? []).filter((f) => f.date >= start && f.date <= end);
  }, [fixtures, week]);

  const groupedFixtures = useMemo(() => {
    const groups = new Map<string, Fixture[]>();
    for (const f of weekFixtures) {
      const arr = groups.get(f.date) ?? [];
      arr.push(f);
      groups.set(f.date, arr);
    }
    return [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [weekFixtures]);

  const weekLabel = `${week.start.toLocaleDateString(undefined, { day: "numeric", month: "short" })} – ${week.end.toLocaleDateString(undefined, { day: "numeric", month: "short" })}`;

  return (
    <AppShell>
      <div className="space-y-4">
        <section className="card-surface rounded-3xl p-4">
          <h1 className="flex items-center gap-2 text-lg font-extrabold">
            <Trophy className="h-5 w-5 text-primary" />
            {t("competitions.title", { defaultValue: "Standings & Fixtures" })}
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">
            {t("competitions.subtitle", {
              defaultValue: "League tables and fixtures from top competitions.",
            })}
          </p>
        </section>

        {/* League selector */}
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
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

        {/* Standings / Fixtures tabs */}
        <div className="flex rounded-full border border-border bg-secondary/50 p-1 text-xs font-semibold">
          {(["standings", "fixtures"] as const).map((k) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              className={`flex-1 rounded-full py-1.5 transition-colors ${
                tab === k ? "bg-primary text-primary-foreground" : "text-muted-foreground"
              }`}
            >
              {t(`competitions.${k}`, {
                defaultValue: k === "standings" ? "Standings" : "Fixtures",
              })}
            </button>
          ))}
        </div>

        {tab === "standings" && (
          <StandingsTable
            standings={standings}
            loading={standingsLoading}
            leagueId={selectedLeague}
            t={t}
          />
        )}

        {tab === "fixtures" && (
          <section className="card-surface rounded-3xl p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
                {t("competitions.fixtures", { defaultValue: "Fixtures" })} · {leagueName}
              </h2>
            </div>

            {/* Week navigator */}
            <div className="mb-4 flex items-center justify-between rounded-2xl bg-secondary/40 px-2 py-2">
              <button
                onClick={() => setWeekOffset((o) => o - 1)}
                className="grid h-8 w-8 place-items-center rounded-full bg-secondary text-foreground transition-colors hover:bg-secondary/70"
                aria-label={t("competitions.prevWeek", { defaultValue: "Previous week" })}
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <div className="text-center">
                <p className="text-xs font-bold">{weekLabel}</p>
                {weekOffset === 0 ? (
                  <p className="text-[10px] text-muted-foreground">
                    {t("competitions.thisWeek", { defaultValue: "This week" })}
                  </p>
                ) : (
                  <button
                    onClick={() => setWeekOffset(0)}
                    className="text-[10px] font-semibold text-primary hover:underline"
                  >
                    {t("competitions.backToThisWeek", { defaultValue: "Back to this week" })}
                  </button>
                )}
              </div>
              <button
                onClick={() => setWeekOffset((o) => o + 1)}
                className="grid h-8 w-8 place-items-center rounded-full bg-secondary text-foreground transition-colors hover:bg-secondary/70"
                aria-label={t("competitions.nextWeek", { defaultValue: "Next week" })}
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            {fixturesLoading ? (
              <div className="space-y-2">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="h-16 animate-pulse rounded-xl bg-secondary/50" />
                ))}
              </div>
            ) : groupedFixtures.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-secondary/20 p-6 text-center">
                <CalendarDays className="mx-auto h-8 w-8 text-muted-foreground" />
                <p className="mt-2 text-sm font-semibold">
                  {t("competitions.noFixtures", { defaultValue: "No fixtures this week" })}
                </p>
                <p className="mx-auto mt-1 max-w-sm text-xs text-muted-foreground">
                  {t("competitions.noFixturesHint", {
                    defaultValue:
                      "No matches are scheduled in this competition for this week. Real fixtures are shown when available — nothing is made up.",
                  })}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {groupedFixtures.map(([date, list]) => (
                  <div key={date}>
                    <h3 className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                      <span className="inline-block h-1 w-1 rounded-full bg-primary" />
                      {dateLabel(date, t)}
                      <span className="text-muted-foreground/60">· {list.length}</span>
                    </h3>
                    <ul className="space-y-2">
                      {list.map((f) => (
                        <FixtureRow key={f.id} fixture={f} t={t} />
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

/* ------------------------------------------------------------------ */
/* Standings table                                                     */
/* ------------------------------------------------------------------ */

function StandingsTable({
  standings,
  loading,
  leagueId,
  t,
}: {
  standings: Standings | undefined;
  loading: boolean;
  leagueId: number;
  t: TFunc;
}) {
  const zones = LEAGUE_ZONES[leagueId] ?? {};

  return (
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

      {loading ? (
        <div className="space-y-2">
          {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
            <div key={i} className="h-10 animate-pulse rounded-xl bg-secondary/50" />
          ))}
        </div>
      ) : !standings?.rows.length ? (
        <div className="rounded-2xl border border-dashed border-border bg-secondary/20 p-6 text-center">
          <Trophy className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-2 text-sm font-semibold">
            {t("competitions.noStandings", { defaultValue: "No standings available" })}
          </p>
          <p className="mx-auto mt-1 max-w-sm text-xs text-muted-foreground">
            {t("competitions.noStandingsHint", {
              defaultValue:
                "Real standings aren't available for this competition right now. No data is shown rather than making it up.",
            })}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-xs">
            <thead>
              <tr className="text-muted-foreground">
                <th className="pb-2 pl-1 text-left font-semibold">#</th>
                <th className="pb-2 text-left font-semibold">
                  {t("competitions.team", { defaultValue: "Team" })}
                </th>
                <th
                  className="pb-2 text-right font-semibold"
                  title={t("competitions.played", { defaultValue: "Played" })}
                >
                  {t("competitions.played", { defaultValue: "O" })}
                </th>
                <th
                  className="pb-2 text-right font-semibold"
                  title={t("competitions.won", { defaultValue: "Won" })}
                >
                  {t("competitions.won", { defaultValue: "G" })}
                </th>
                <th
                  className="pb-2 text-right font-semibold"
                  title={t("competitions.drawn", { defaultValue: "Drawn" })}
                >
                  {t("competitions.drawn", { defaultValue: "B" })}
                </th>
                <th
                  className="pb-2 text-right font-semibold"
                  title={t("competitions.lost", { defaultValue: "Lost" })}
                >
                  {t("competitions.lost", { defaultValue: "M" })}
                </th>
                <th
                  className="pb-2 text-right font-semibold"
                  title={t("competitions.goalsFor", { defaultValue: "Goals for" })}
                >
                  {t("competitions.goalsFor", { defaultValue: "AG" })}
                </th>
                <th
                  className="pb-2 text-right font-semibold"
                  title={t("competitions.goalsAgainst", { defaultValue: "Goals against" })}
                >
                  {t("competitions.goalsAgainst", { defaultValue: "YG" })}
                </th>
                <th
                  className="pb-2 text-right font-semibold"
                  title={t("competitions.goalDiff", { defaultValue: "Goal difference" })}
                >
                  {t("competitions.goalDiff", { defaultValue: "AV" })}
                </th>
                <th
                  className="pb-2 pr-1 text-right font-bold"
                  title={t("competitions.points", { defaultValue: "Points" })}
                >
                  {t("competitions.points", { defaultValue: "P" })}
                </th>
                <th className="pb-2 text-right font-semibold">
                  {t("competitions.form", { defaultValue: "Form" })}
                </th>
              </tr>
            </thead>
            <tbody>
              {standings.rows.map((row) => (
                <StandingRowView key={row.team.id} row={row} leagueId={leagueId} />
              ))}
            </tbody>
          </table>

          {/* Zone legend */}
          {(zones.cl || zones.el || zones.relegation) && (
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-border pt-3 text-[10px] font-semibold text-muted-foreground">
              {zones.cl && (
                <span className="inline-flex items-center gap-1.5">
                  <span
                    className="inline-block h-2.5 w-1 rounded-full"
                    style={{ backgroundColor: ZONE_COLORS.cl }}
                  />
                  {t("competitions.zoneChampionsLeague", { defaultValue: "Champions League" })}
                </span>
              )}
              {zones.el && (
                <span className="inline-flex items-center gap-1.5">
                  <span
                    className="inline-block h-2.5 w-1 rounded-full"
                    style={{ backgroundColor: ZONE_COLORS.el }}
                  />
                  {t("competitions.zoneEuropaLeague", { defaultValue: "Europa League" })}
                </span>
              )}
              {zones.relegation && (
                <span className="inline-flex items-center gap-1.5">
                  <span
                    className="inline-block h-2.5 w-1 rounded-full"
                    style={{ backgroundColor: ZONE_COLORS.relegation }}
                  />
                  {t("competitions.zoneRelegation", { defaultValue: "Relegation" })}
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function StandingRowView({ row, leagueId }: { row: StandingRow; leagueId: number }) {
  const zone = zoneForRank(leagueId, row.rank);
  return (
    <tr className="border-t border-border/50">
      <td className="relative py-2 pl-1">
        {zone && (
          <span
            aria-hidden
            className="absolute inset-y-0 left-0 w-[3px] rounded-full"
            style={{ backgroundColor: ZONE_COLORS[zone] }}
          />
        )}
        <span className="font-extrabold tabular-nums text-muted-foreground">{row.rank}</span>
      </td>
      <td className="py-2">
        <div className="flex items-center gap-2">
          <TeamLogo logo={row.team.logo} name={row.team.name} />
          <span className="whitespace-nowrap font-semibold">{row.team.name}</span>
        </div>
      </td>
      <td className="py-2 text-right tabular-nums text-muted-foreground">{row.played}</td>
      <td className="py-2 text-right tabular-nums">{row.wins}</td>
      <td className="py-2 text-right tabular-nums">{row.draws}</td>
      <td className="py-2 text-right tabular-nums">{row.losses}</td>
      <td className="py-2 text-right tabular-nums">{row.goalsFor}</td>
      <td className="py-2 text-right tabular-nums">{row.goalsAgainst}</td>
      <td className="py-2 text-right tabular-nums">
        {row.goalDiff > 0 ? `+${row.goalDiff}` : row.goalDiff}
      </td>
      <td className="py-2 pr-1 text-right font-extrabold tabular-nums text-accent">{row.points}</td>
      <td className="py-2 text-right">
        <FormStrip form={row.form} />
      </td>
    </tr>
  );
}

/* ------------------------------------------------------------------ */
/* Fixtures rows                                                       */
/* ------------------------------------------------------------------ */

function FixtureRow({ fixture, t }: { fixture: Fixture; t: TFunc }) {
  const finished = fixture.status === "finished";
  const live = fixture.status === "live" || fixture.status === "halftime";
  const hasScore = fixture.home.score != null && fixture.away.score != null;

  return (
    <li>
      <Link
        to="/match/$id"
        params={{ id: String(fixture.id) }}
        className="flex items-center gap-3 rounded-xl bg-secondary/40 px-3 py-3 transition-colors hover:bg-secondary/70"
      >
        <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
          <span className="truncate text-sm font-semibold">{fixture.home.name}</span>
          <TeamLogo logo={fixture.home.logo} name={fixture.home.name} />
        </div>

        <div className="flex w-20 shrink-0 flex-col items-center justify-center">
          {hasScore ? (
            <span className="text-base font-extrabold tabular-nums">
              {fixture.home.score} - {fixture.away.score}
            </span>
          ) : (
            <span className="text-xs font-semibold text-muted-foreground">
              {t("competitions.vs", { defaultValue: "vs" })}
            </span>
          )}
          {finished ? (
            <span className="mt-0.5 rounded-full bg-secondary px-2 py-0.5 text-[9px] font-bold text-muted-foreground">
              {t("liveCenter.finished", { defaultValue: "FT" })}
            </span>
          ) : live ? (
            <span className="mt-0.5 inline-flex items-center gap-1 rounded-full bg-primary/20 px-2 py-0.5 text-[9px] font-bold text-primary">
              <span className="h-1.5 w-1.5 animate-ping rounded-full bg-primary" />
              {fixture.minute != null && fixture.minute > 0
                ? `${fixture.minute}'`
                : t("liveCenter.live", { defaultValue: "LIVE" })}
            </span>
          ) : (
            <span className="mt-0.5 text-[10px] font-semibold tabular-nums text-muted-foreground">
              {kickoffTime(fixture) || "—"}
            </span>
          )}
        </div>

        <div className="flex min-w-0 flex-1 items-center gap-2">
          <TeamLogo logo={fixture.away.logo} name={fixture.away.name} />
          <span className="truncate text-sm font-semibold">{fixture.away.name}</span>
        </div>
      </Link>
    </li>
  );
}
