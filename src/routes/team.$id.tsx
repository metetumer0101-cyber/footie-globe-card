import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  CalendarClock,
  Globe2,
  Loader2,
  MapPin,
  Search,
  TrendingUp,
  Trophy,
  Users,
  Wallet,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { InfoRow } from "@/components/analytics/CardDetailModal";
import { FavoriteButton } from "@/components/FavoriteButton";
import { RefreshDataButton } from "@/components/RefreshDataButton";
import { getTeamPage, getTeamPageByName, searchWorldTeams } from "@/lib/entity.functions";
import { getTeamRecentTransfers } from "@/lib/freshness.functions";
import { teams, tierStyles, type TeamStats } from "@/data/football";
import { cn } from "@/lib/utils";

const SITE = "https://footie-globe-card.lovable.app";

export const Route = createFileRoute("/team/$id")({
  head: ({ params }) => {
    const local = teams.find((tm) => tm.id === params.id);
    const title = local ? `${local.name} — FootCard` : "Team Profile — FootCard";
    const description = local
      ? `${local.name} team profile: ${local.league}. Squad, stats and form on FootCard.`
      : "Football team profile with live squad, venue and season stats on FootCard.";
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "profile" },
        { property: "og:url", content: `${SITE}/team/${params.id}` },
        { name: "twitter:card", content: "summary" },
      ],
      links: [{ rel: "canonical", href: `${SITE}/team/${params.id}` }],
      ...(local
        ? {
            scripts: [
              {
                type: "application/ld+json",
                children: JSON.stringify({
                  "@context": "https://schema.org",
                  "@type": "SportsTeam",
                  name: local.name,
                  sport: "Soccer",
                  memberOf: { "@type": "SportsLeague", name: local.league },
                }),
              },
            ],
          }
        : {}),
    };
  },
  component: TeamPage,
});

const GROUP_ORDER = ["Goalkeeper", "Defender", "Midfielder", "Attacker"] as const;
const GROUP_KEYS: Record<(typeof GROUP_ORDER)[number], string> = {
  Goalkeeper: "gk",
  Defender: "def",
  Midfielder: "mid",
  Attacker: "att",
};

function TeamSearchBox() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const search = useServerFn(searchWorldTeams);
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");

  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(q), 350);
    return () => window.clearTimeout(id);
  }, [q]);

  const active = debounced.trim().length >= 3;
  const { data, isFetching } = useQuery({
    queryKey: ["team-search", debounced.trim().toLowerCase()],
    queryFn: () => search({ data: { query: debounced.trim() } }),
    enabled: active,
    staleTime: 10 * 60 * 1000,
  });

  return (
    <div className="relative">
      <label className="card-surface flex items-center gap-2 rounded-2xl px-3 py-2.5">
        <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t("teamPage.search")}
          className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
        {isFetching && <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" />}
      </label>
      {active && data && data.length > 0 && (
        <ul className="card-surface absolute inset-x-0 top-full z-20 mt-1 max-h-72 overflow-y-auto rounded-2xl border border-border p-1.5 shadow-xl">
          {data.map((hit) => (
            <li key={hit.id}>
              <button
                onClick={() => {
                  setQ("");
                  void navigate({ to: "/team/$id", params: { id: `api-${hit.id}` } });
                }}
                className="flex w-full items-center gap-2.5 rounded-xl px-2 py-2 text-start transition-colors hover:bg-secondary/40"
              >
                {hit.logo ? (
                  <img
                    src={hit.logo}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className="h-7 w-7 shrink-0 object-contain"
                  />
                ) : (
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-secondary/50 text-xs">
                    🛡️
                  </span>
                )}
                <span className="min-w-0 flex-1 truncate text-sm font-semibold">{hit.name}</span>
                <span className="shrink-0 text-xs text-muted-foreground">{hit.country}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function StatBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="font-semibold text-muted-foreground">{label}</span>
        <span className="font-bold">{value}</span>
      </div>
      <div className="h-1.5 rounded-full bg-secondary">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        />
      </div>
    </div>
  );
}

function TeamPage() {
  const { t } = useTranslation();
  const { id } = Route.useParams();
  const local = teams.find((tm) => tm.id === id);
  const apiId = id.startsWith("api-") ? Number(id.slice(4)) : NaN;
  const byId = useServerFn(getTeamPage);
  const byName = useServerFn(getTeamPageByName);
  const loadTransfers = useServerFn(getTeamRecentTransfers);

  const { data: result, isLoading } = useQuery({
    queryKey: ["team-page", id],
    queryFn: () =>
      local ? byName({ data: { name: local.name } }) : byId({ data: { teamId: apiId } }),
    enabled: Boolean(local) || Number.isFinite(apiId),
    staleTime: 60 * 60 * 1000,
  });

  const api = result?.data ?? null;
  const fetchedAt = result?.fetchedAt ?? null;

  // Recent inbound transfers power the "new signing" badges on the squad list.
  const { data: recentTransfers } = useQuery({
    queryKey: ["team-transfers", api?.id],
    queryFn: () => loadTransfers({ data: { teamId: api?.id ?? 0 } }),
    enabled: Boolean(api?.id),
    staleTime: 6 * 60 * 60 * 1000,
  });
  const newSignings = new Map((recentTransfers ?? []).map((tr) => [tr.playerId, tr.date]));

  const invalid = !local && !Number.isFinite(apiId);
  const notFound = invalid || (!local && !isLoading && !api);
  const name = local?.name ?? api?.name ?? "";
  const logo = api?.logo;

  return (
    <AppShell>
      <div className="space-y-4">
        <Link
          to="/"
          className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {t("teamPage.back")}
        </Link>

        <TeamSearchBox />

        {notFound ? (
          <section className="card-surface rounded-3xl p-8 text-center">
            <h1 className="text-lg font-bold">{t("teamPage.notFound")}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{t("teamPage.notFoundHint")}</p>
          </section>
        ) : (
          <>
            <section className="card-surface rounded-3xl p-4">
              <div className="flex items-center gap-4">
                {logo ? (
                  <img src={logo} alt={name} className="h-16 w-16 shrink-0 object-contain" />
                ) : (
                  <span className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-secondary/50 text-3xl">
                    {local?.clubBadge ?? "🛡️"}
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <h1 className="truncate text-xl font-bold">{name}</h1>
                  <p className="truncate text-sm text-muted-foreground">
                    {[api?.country, local?.league].filter(Boolean).join(" · ")}
                  </p>
                  {local && (
                    <span
                      className={cn(
                        "mt-1.5 inline-block rounded-full px-2.5 py-0.5 text-[11px] font-bold",
                        tierStyles[local.tier].chip,
                      )}
                    >
                      {t(local.tier)}
                    </span>
                  )}
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1.5">
                  {name && <FavoriteButton type="team" id={id} name={name} />}
                  <RefreshDataButton
                    kind="team"
                    id={id}
                    apiId={api?.id ?? (Number.isFinite(apiId) ? apiId : undefined)}
                    name={local?.name ?? api?.name}
                    fetchedAt={fetchedAt}
                  />
                </div>
              </div>

              {api && (api.founded || api.venueName || api.country) && (
                <div className="mt-3 grid gap-1.5 sm:grid-cols-2">
                  {api.founded != null && (
                    <InfoRow
                      icon={CalendarClock}
                      label={t("teamPage.founded")}
                      value={String(api.founded)}
                    />
                  )}
                  {api.venueName && (
                    <InfoRow
                      icon={MapPin}
                      label={t("teamPage.stadium")}
                      value={`${api.venueName}${api.venueCity ? `, ${api.venueCity}` : ""}`}
                    />
                  )}
                  {api.venueCapacity != null && (
                    <InfoRow
                      icon={Users}
                      label={t("teamPage.capacity")}
                      value={api.venueCapacity.toLocaleString()}
                    />
                  )}
                  {api.country && (
                    <InfoRow icon={Globe2} label={t("teamPage.country")} value={api.country} />
                  )}
                </div>
              )}
            </section>

            {local && (
              <section className="card-surface space-y-2.5 rounded-3xl p-4">
                <h2 className="text-xs font-bold uppercase tracking-wide text-accent">
                  {t("teamPage.stats")}
                </h2>
                {(Object.keys(local.stats) as (keyof TeamStats)[]).map((k) => (
                  <StatBar key={k} label={t(`attr.${k}`)} value={local.stats[k]} />
                ))}
                <div className="grid gap-1.5 pt-1 sm:grid-cols-2">
                  <InfoRow
                    icon={TrendingUp}
                    label={t("teamPage.winRate")}
                    value={`${local.winRate}%`}
                  />
                  <InfoRow icon={Trophy} label={t("teamPage.trophies")} value={String(local.trophies)} />
                  <InfoRow icon={Wallet} label={t("teamPage.squadValue")} value={local.squadValue} />
                  <InfoRow icon={Users} label={t("teamPage.avgAge")} value={String(local.avgAge)} />
                </div>
              </section>
            )}

            {isLoading && (
              <div className="space-y-2">
                <div className="card-surface h-8 animate-pulse rounded-2xl" />
                <div className="card-surface h-40 animate-pulse rounded-2xl" />
              </div>
            )}

            {api && api.squad.length > 0 && (
              <section className="space-y-3">
                <h2 className="text-xs font-bold uppercase tracking-wide text-accent">
                  {t("teamPage.squad")}
                </h2>
                {GROUP_ORDER.map((group) => {
                  const members = api.squad.filter((p) => p.position === group);
                  if (!members.length) return null;
                  return (
                    <div key={group} className="card-surface rounded-2xl p-2.5">
                      <h3 className="px-1 pb-1.5 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                        {t(`teamPage.${GROUP_KEYS[group]}`)}
                      </h3>
                      <ul className="divide-y divide-border/60">
                        {members.map((p) => (
                          <li key={p.id}>
                            <Link
                              to="/player/$id"
                              params={{ id: `api-${p.id}` }}
                              className="flex items-center gap-3 rounded-xl px-1.5 py-2 transition-colors hover:bg-secondary/40"
                            >
                              <img
                                src={p.photo}
                                alt={p.name}
                                loading="lazy"
                                className="h-9 w-9 shrink-0 rounded-full bg-secondary/50 object-cover"
                              />
                              <span className="min-w-0 flex-1">
                                <span className="flex items-center gap-1.5 truncate text-sm font-semibold">
                                  <span className="truncate">{p.name}</span>
                                  {newSignings.has(p.id) && (
                                    <span className="shrink-0 rounded-full bg-accent/20 px-1.5 py-px text-[9px] font-bold uppercase tracking-wide text-accent">
                                      {t("freshness.newSigning")}
                                    </span>
                                  )}
                                </span>
                                <span className="block truncate text-xs text-muted-foreground">
                                  {p.position}
                                  {p.age != null ? ` · ${p.age}` : ""}
                                </span>
                              </span>
                              {p.number != null && (
                                <span className="shrink-0 rounded-lg bg-secondary/60 px-2 py-0.5 text-xs font-bold">
                                  {p.number}
                                </span>
                              )}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </section>
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}
