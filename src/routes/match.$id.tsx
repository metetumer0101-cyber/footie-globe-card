import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useTranslation } from "react-i18next";
import { Activity, ArrowLeft, ArrowLeftRight, CalendarX, Radio, Tv } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { getH2H, getMatchDetailPage, type H2HRecord } from "@/lib/football-data.functions";
import type {
  MatchDetailEvent,
  MatchDetailLineup,
  MatchDetailLineupRow,
  MatchDetailPage,
  MatchDetailStat,
} from "@/lib/football-data.functions";

export const Route = createFileRoute("/match/$id")({
  head: ({ params }) => ({
    meta: [
      { title: `Match Detail — FootCard #${params.id}` },
      { name: "description", content: "Match statistics, lineups, events and head-to-head history on FootCard." },
      { property: "og:title", content: `Match Detail — FootCard #${params.id}` },
      { property: "og:description", content: "Match statistics, lineups, events and head-to-head history." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MatchDetailRoute,
});

type DetailTab = "stats" | "lineups" | "events" | "h2h";

type T = (k: string, o?: { defaultValue?: string }) => string;

/** Live minute, e.g. `43'` or `45+2'` when stoppage time is available (mirrors the live page). */
function minuteLabel(minute: number, addedTime?: number | undefined): string {
  if (addedTime != null && addedTime > 0) return `${minute}+${addedTime}'`;
  return `${minute}'`;
}

/** The exact "Live Pulse Badge" style used on the live page — green pulsing dot + minute. */
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

/** Status badge for the match-detail header — same presentation as the live page's status badge. */
function StatusBadge({ page, t }: { page: MatchDetailPage; t: T }) {
  const { status, minute, addedTime } = page.header;
  if (status === "halftime") {
    return (
      <span className="inline-flex items-center rounded-full bg-accent/20 px-2.5 py-1 text-[11px] font-extrabold text-accent">
        {t("liveCenter.halftime", { defaultValue: "İY" })}
      </span>
    );
  }
  if (status === "finished") {
    return (
      <span className="inline-flex items-center rounded-full bg-secondary px-2.5 py-1 text-[11px] font-extrabold text-muted-foreground">
        {t("liveCenter.finished", { defaultValue: "MS" })}
      </span>
    );
  }
  if (status === "live") {
    return <LivePulseBadge minute={minuteLabel(minute, addedTime)} />;
  }
  return (
    <span className="inline-flex items-center rounded-full bg-secondary px-2.5 py-1 text-[11px] font-extrabold text-muted-foreground">
      {t("liveCenter.scheduled", { defaultValue: "Scheduled" })}
    </span>
  );
}

/** Team crest or a fallback badge (mirrors the live-page TeamLogo). */
function TeamLogo({ logo, name }: { logo?: string | undefined; name: string }) {
  if (logo) return <img src={logo} alt={`${name} logo`} loading="lazy" className="h-8 w-8 shrink-0 object-contain" />;
  return <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-secondary text-sm">⚽</span>;
}

/** League badge (logo if present, else a shield icon). */
function LeagueBadge({ logo, name }: { logo?: string | undefined; name: string }) {
  if (logo) return <img src={logo} alt={`${name} logo`} loading="lazy" className="h-4 w-4 shrink-0 rounded-full object-contain" />;
  return <Radio className="h-3.5 w-3.5 shrink-0" aria-hidden />;
}

/* ------------------------------------------------------------------ */
/* Header / summary card                                               */
/* ------------------------------------------------------------------ */

function HeaderCard({ page, t }: { page: MatchDetailPage; t: T }) {
  const { header } = page;
  return (
    <section className="card-surface rounded-3xl p-4">
      <div className="flex items-center justify-center gap-2 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
        <LeagueBadge logo={header.league.logo} name={header.league.name} />
        <span className="truncate">{header.league.name}</span>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <div className="flex min-w-0 flex-1 flex-col items-center gap-1.5 text-center">
          <TeamLogo logo={header.home.logo} name={header.home.name} />
          <span className="w-full truncate text-sm font-bold">{header.home.name}</span>
        </div>

        <div className="flex shrink-0 flex-col items-center gap-1.5">
          <div className="text-3xl font-extrabold tabular-nums leading-none">
            {header.home.score} <span className="text-lg font-bold text-muted-foreground">-</span> {header.away.score}
          </div>
          <StatusBadge page={page} t={t} />
        </div>

        <div className="flex min-w-0 flex-1 flex-col items-center gap-1.5 text-center">
          <TeamLogo logo={header.away.logo} name={header.away.name} />
          <span className="w-full truncate text-sm font-bold">{header.away.name}</span>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* İstatistikler (stats)                                               */
/* ------------------------------------------------------------------ */

function StatBar({ stat }: { stat: MatchDetailStat }) {
  const total = (stat.home + stat.away) || 1;
  const homePct = Math.round((stat.home / total) * 100);
  return (
    <div>
      <div className="mb-1 flex items-center gap-2 text-xs font-semibold">
        <span className="w-8 shrink-0 text-right tabular-nums">{stat.home}</span>
        <span className="min-w-0 flex-1 truncate text-center text-xs text-muted-foreground">{stat.label}</span>
        <span className="w-8 shrink-0 text-left tabular-nums">{stat.away}</span>
      </div>
      <div className="flex h-2 overflow-hidden rounded-full bg-secondary/70">
        <div className="h-full rounded-l-full bg-primary transition-all" style={{ width: `${homePct}%` }} />
        <div className="h-full rounded-r-full bg-accent transition-all" style={{ width: `${100 - homePct}%` }} />
      </div>
    </div>
  );
}

function StatsTab({ stats, t }: { stats: MatchDetailStat[]; t: T }) {
  if (!stats.length) {
    return <EmptyBox icon={<Activity className="h-6 w-6" aria-hidden />} text={t("liveCenter.noStats", { defaultValue: "Statistics are not provided for this competition." })} />;
  }
  return (
    <section className="card-surface rounded-3xl p-4">
      <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-muted-foreground">
        {t("liveCenter.tabStats", { defaultValue: "Stats" })}
      </h2>
      <div className="space-y-3">
        {stats.map((s) => (
          <StatBar key={s.key} stat={s} />
        ))}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Kadrolar (lineups)                                                  */
/* ------------------------------------------------------------------ */

/** Player row photo with an honest monogram fallback when the image is missing. */
function PlayerPhoto({ row }: { row: MatchDetailLineupRow }) {
  const [failed, setFailed] = useState(false);
  const initials = row.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

  if (!row.photo || failed) {
    return (
      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-secondary text-[10px] font-bold text-muted-foreground">
        {initials || "?"}
      </span>
    );
  }
  return (
    <img
      src={row.photo}
      alt={row.name}
      loading="lazy"
      onError={() => setFailed(true)}
      className="h-7 w-7 shrink-0 rounded-full bg-secondary object-cover"
    />
  );
}

function LineupCard({ lineup, t }: { lineup: MatchDetailLineup; t: T }) {
  return (
    <div className="rounded-2xl border border-border bg-secondary/30 p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-bold">{lineup.teamName || t("liveCenter.team", { defaultValue: "Team" })}</span>
        <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold text-primary">
          {lineup.formation}
        </span>
      </div>
      <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {t("liveCenter.startXI", { defaultValue: "Starting XI" })}
      </p>
      {lineup.startXI.length ? (
        <ul className="mb-3 space-y-1">
          {lineup.startXI.map((p) => (
            <li key={p.id} className="flex items-center gap-2 text-xs">
              <span className="w-5 shrink-0 text-right font-bold text-muted-foreground">{p.number || "—"}</span>
              <PlayerPhoto row={p} />
              <span className="min-w-0 flex-1 truncate">{p.name}</span>
              <span className="shrink-0 text-[10px] text-muted-foreground">{p.pos && p.pos !== "—" ? p.pos : "—"}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mb-3 py-1 text-center text-xs text-muted-foreground">
          {t("liveCenter.noLineupsStartXI", { defaultValue: "No starting line-up announced." })}
        </p>
      )}
      <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {t("liveCenter.bench", { defaultValue: "Bench" })}
      </p>
      {lineup.substitutes.length ? (
        <ul className="space-y-1">
          {lineup.substitutes.map((p) => (
            <li key={p.id} className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="w-5 shrink-0 text-right font-bold">{p.number || "—"}</span>
              <PlayerPhoto row={p} />
              <span className="min-w-0 flex-1 truncate">{p.name}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="py-1 text-center text-xs text-muted-foreground">
          {t("liveCenter.noLineupsBench", { defaultValue: "No substitutes listed." })}
        </p>
      )}
    </div>
  );
}

function LineupsTab({ lineups, t }: { lineups: MatchDetailLineup[]; t: T }) {
  if (!lineups.length) {
    return <EmptyBox icon={<Activity className="h-6 w-6" aria-hidden />} text={t("liveCenter.noLineups", { defaultValue: "Lineups are not provided for this competition." })} />;
  }
  return (
    <section className="card-surface rounded-3xl p-4">
      <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-muted-foreground">
        {t("liveCenter.tabLineups", { defaultValue: "Lineups" })}
      </h2>
      <div className="space-y-4">
        {lineups.map((l) => (
          <LineupCard key={l.teamId} lineup={l} t={t} />
        ))}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Olaylar (events timeline)                                           */
/* ------------------------------------------------------------------ */

function EventIcon({ type }: { type: string }) {
  if (type === "Goal") return <span className="text-sm leading-none" aria-hidden>⚽</span>;
  if (type === "Card") return <span className="inline-block h-3 w-2 rounded-[2px] bg-yellow-400" aria-hidden />;
  if (type === "Subst") return <ArrowLeftRight className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />;
  if (type === "Var") return <Tv className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />;
  return <span className="inline-block h-2 w-2 rounded-full bg-muted-foreground" aria-hidden />;
}

function EventsTab({ events, t }: { events: MatchDetailEvent[]; t: T }) {
  if (!events.length) {
    return <EmptyBox icon={<Activity className="h-6 w-6" aria-hidden />} text={t("liveCenter.noEvents", { defaultValue: "No events yet." })} />;
  }
  const sorted = [...events].sort((a, b) => b.minute - a.minute);
  return (
    <section className="card-surface rounded-3xl p-4">
      <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-muted-foreground">
        {t("liveCenter.tabEvents", { defaultValue: "Events" })}
      </h2>
      <ol className="relative space-y-3 before:absolute before:bottom-1 before:left-[11px] before:top-1 before:w-px before:bg-border">
        {sorted.map((e, i) => (
          <li key={i} className="relative flex items-center gap-3 pl-7">
            <span className="absolute left-0 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-full bg-secondary">
              <EventIcon type={e.type} />
            </span>
            <span className="w-9 shrink-0 text-right text-[11px] font-extrabold tabular-nums text-muted-foreground">
              {e.minute}'
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold">{e.player}</p>
              {e.detail ? <p className="truncate text-[10px] text-muted-foreground">{e.detail}</p> : null}
            </div>
            <span className="shrink-0 text-[10px] text-muted-foreground">
              {e.side === "home" ? t("liveCenter.home", { defaultValue: "Home" }) : t("liveCenter.away", { defaultValue: "Away" })}
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* H2H                                                                 */
/* ------------------------------------------------------------------ */

function H2HRow({ record, t }: { record: H2HRecord; t: T }) {
  const scores = record.homeScore != null && record.awayScore != null;
  return (
    <li className="rounded-2xl border border-border bg-secondary/30 p-3">
      <div className="flex items-center gap-2 text-xs">
        <span className="min-w-0 flex-1 truncate font-semibold">{record.home}</span>
        <span className="shrink-0 tabular-nums font-extrabold">
          {scores ? `${record.homeScore} - ${record.awayScore}` : "—"}
        </span>
        <span className="min-w-0 flex-1 truncate text-right font-semibold">{record.away}</span>
      </div>
      <div className="mt-1.5 flex items-center justify-between text-[10px] text-muted-foreground">
        <span className="tabular-nums">{record.date || "—"}</span>
        <span>{record.result === "—" ? t("liveCenter.h2hNoResult", { defaultValue: "—" }) : record.result}</span>
      </div>
    </li>
  );
}

function H2HTab({ records, t }: { records: H2HRecord[]; t: T }) {
  if (!records.length) {
    return <EmptyBox icon={<CalendarX className="h-6 w-6" aria-hidden />} text={t("liveCenter.noH2H", { defaultValue: "No head-to-head matches available." })} />;
  }
  return (
    <section className="card-surface rounded-3xl p-4">
      <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-muted-foreground">
        {t("liveCenter.tabH2H", { defaultValue: "H2H" })}
      </h2>
      <ul className="space-y-3">
        {records.map((r) => (
          <H2HRow key={r.fixtureId} record={r} t={t} />
        ))}
      </ul>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Shared bits                                                         */
/* ------------------------------------------------------------------ */

function EmptyBox({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="rounded-3xl border border-dashed border-border p-8 text-center">
      <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-secondary/60">
        {icon}
      </div>
      <p className="mx-auto max-w-sm text-sm text-muted-foreground">{text}</p>
    </div>
  );
}

function SkeletonBlock() {
  return (
    <div className="card-surface rounded-3xl p-4">
      <div className="animate-pulse space-y-3">
        <div className="mx-auto h-3 w-32 rounded-full bg-secondary" />
        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-1 flex-col items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-secondary" />
            <div className="h-3 w-20 rounded-full bg-secondary" />
          </div>
          <div className="h-8 w-16 rounded-lg bg-secondary" />
          <div className="flex flex-1 flex-col items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-secondary" />
            <div className="h-3 w-20 rounded-full bg-secondary" />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Route component                                                     */
/* ------------------------------------------------------------------ */

function MatchDetailRoute() {
  const { t } = useTranslation();
  const { id } = Route.useParams();
  const parsed = Number(id);
  const validId = Number.isFinite(parsed) && parsed > 0;

  const fetchPage = useServerFn(getMatchDetailPage);
  const fetchH2H = useServerFn(getH2H);

  const { data: page, isLoading } = useQuery({
    queryKey: ["match-detail-page", validId ? parsed : -1],
    queryFn: () => fetchPage({ data: { fixtureId: parsed } }),
    enabled: validId,
  });

  const homeId = page?.header.home.id;
  const awayId = page?.header.away.id;
  const canH2H = validId && !!homeId && !!awayId;

  const { data: h2h } = useQuery({
    queryKey: ["h2h", homeId ?? -1, awayId ?? -1],
    queryFn: () => fetchH2H({ data: { homeTeamId: homeId!, awayTeamId: awayId! } }),
    enabled: canH2H,
  });

  const [tab, setTab] = useState<DetailTab>("stats");

  const tabs: [DetailTab, string][] = [
    ["stats", t("liveCenter.tabStats", { defaultValue: "Stats" })],
    ["lineups", t("liveCenter.tabLineups", { defaultValue: "Lineups" })],
    ["events", t("liveCenter.tabEvents", { defaultValue: "Events" })],
    ["h2h", t("liveCenter.tabH2H", { defaultValue: "H2H" })],
  ];

  return (
    <AppShell>
      <div className="space-y-3">
        <Link
          to="/live"
          className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {t("liveCenter.backToLive", { defaultValue: "Back to live matches" })}
        </Link>

        {!validId ? (
          <EmptyBox icon={<Activity className="h-6 w-6" aria-hidden />} text={t("liveCenter.invalidMatchId", { defaultValue: "That match could not be found." })} />
        ) : isLoading ? (
          <SkeletonBlock />
        ) : !page || page.header.home.name === "—" ? (
          <EmptyBox icon={<Activity className="h-6 w-6" aria-hidden />} text={t("liveCenter.noMatchDetail", { defaultValue: "Match details could not be loaded." })} />
        ) : (
          <>
            <HeaderCard page={page} t={t} />

            {/* 4 tabs — pill style consistent with the live page status tabs */}
            <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar text-xs font-semibold">
              {tabs.map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setTab(key)}
                  className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 transition-colors ${
                    tab === key ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {tab === "stats" && <StatsTab stats={page.stats} t={t} />}
            {tab === "lineups" && <LineupsTab lineups={page.lineups} t={t} />}
            {tab === "events" && <EventsTab events={page.events} t={t} />}
            {tab === "h2h" && (
              canH2H ? (
                h2h ? <H2HTab records={h2h} t={t} /> : <SkeletonBlock />
              ) : (
                <EmptyBox icon={<CalendarX className="h-6 w-6" aria-hidden />} text={t("liveCenter.noH2H", { defaultValue: "No head-to-head matches available." })} />
              )
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}
