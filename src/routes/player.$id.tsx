import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useTranslation } from "react-i18next";
import {
  Activity,
  ArrowLeft,
  CalendarClock,
  Check,
  Footprints,
  Ruler,
  Share2,
  TrendingUp,
  Weight,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { RadarChart } from "@/components/analytics/RadarChart";
import { AttributeList } from "@/components/analytics/AttributeList";
import { TransferTimeline } from "@/components/analytics/TransferTimeline";
import { InfoRow } from "@/components/analytics/CardDetailModal";
import { FavoriteButton } from "@/components/FavoriteButton";
import { RefreshDataButton } from "@/components/RefreshDataButton";
import { getWorldPlayerCard } from "@/lib/player-search.functions";
import { getPlayerCurrentClub, resolveApiPlayerId } from "@/lib/freshness.functions";
import { players, tierStyles, type PlayerCardData } from "@/data/football";
import { cn } from "@/lib/utils";

const SITE = "https://footie-globe-card.lovable.app";

export const Route = createFileRoute("/player/$id")({
  head: ({ params }) => {
    const local = players.find((p) => p.id === params.id);
    const title = local ? `${local.name} — FootCard` : "Player Profile — FootCard";
    const description = local
      ? `${local.name} player card: ${local.position} at ${local.club}. Radar stats, 30+ deep attributes and transfer history on FootCard.`
      : "Full football player card with radar stats, deep attributes and transfer history on FootCard.";
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "profile" },
        { property: "og:url", content: `${SITE}/player/${params.id}` },
        { name: "twitter:card", content: "summary" },
      ],
      links: [{ rel: "canonical", href: `${SITE}/player/${params.id}` }],
      ...(local
        ? {
            scripts: [
              {
                type: "application/ld+json",
                children: JSON.stringify({
                  "@context": "https://schema.org",
                  "@type": "Person",
                  name: local.name,
                  nationality: local.nation,
                  affiliation: { "@type": "SportsTeam", name: local.club },
                }),
              },
            ],
          }
        : {}),
    };
  },
  component: PlayerPage,
});

function PlayerPage() {
  const { t } = useTranslation();
  const { id } = Route.useParams();
  const local = players.find((p) => p.id === id);
  const directApiId = id.startsWith("api-") ? Number(id.slice(4)) : NaN;
  const loadCard = useServerFn(getWorldPlayerCard);
  const resolveRef = useServerFn(resolveApiPlayerId);
  const loadClub = useServerFn(getPlayerCurrentClub);
  const [copied, setCopied] = useState(false);

  const { data: cardResult, isLoading } = useQuery({
    queryKey: ["player-page", directApiId],
    queryFn: () => loadCard({ data: { playerId: directApiId } }),
    enabled: !local && Number.isFinite(directApiId),
    staleTime: 30 * 60 * 1000,
  });

  // Catalogue players: resolve their API id once (cached 7d server-side).
  const { data: resolved } = useQuery({
    queryKey: ["player-ref", local?.id],
    queryFn: () => resolveRef({ data: { name: local?.name ?? "" } }),
    enabled: Boolean(local && !local.apiId),
    staleTime: 7 * 24 * 60 * 60 * 1000,
  });

  const apiPlayerId = Number.isFinite(directApiId)
    ? directApiId
    : (local?.apiId ?? resolved?.apiId ?? NaN);

  // Live club overlay: the latest transfer is fresher than squad listings.
  const { data: clubResult } = useQuery({
    queryKey: ["current-club", apiPlayerId],
    queryFn: () => loadClub({ data: { apiPlayerId } }),
    enabled: Number.isFinite(apiPlayerId),
    staleTime: 60 * 60 * 1000,
  });

  const baseCard: PlayerCardData | null = local ?? cardResult?.data?.card ?? null;
  const liveClub = clubResult?.data ?? null;
  const card: PlayerCardData | null =
    baseCard && liveClub && liveClub.club && liveClub.club !== baseCard.club
      ? { ...baseCard, club: liveClub.club }
      : baseCard;
  const loading = !local && isLoading;
  const fetchedAt = clubResult?.fetchedAt ?? cardResult?.fetchedAt ?? null;

  const share = async () => {
    const url = window.location.href;
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title: card?.name ?? "FootCard", url });
        return;
      } catch {
        /* share cancelled — fall through to clipboard */
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <AppShell>
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-2">
          <Link
            to="/scout"
            className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {t("playerPage.back")}
          </Link>
          {card && (
            <div className="flex items-center gap-2">
              <FavoriteButton type="player" id={card.id} name={card.name} />
              <RefreshDataButton
                kind="player"
                id={id}
                apiId={Number.isFinite(apiPlayerId) ? apiPlayerId : undefined}
                name={local?.name ?? card.name}
                fetchedAt={fetchedAt}
              />
              <button
                onClick={() => void share()}
                className="inline-flex items-center gap-1.5 rounded-xl bg-secondary/60 px-3 py-1.5 text-xs font-semibold transition-colors hover:bg-secondary"
              >
                {copied ? (
                  <Check className="h-3.5 w-3.5 text-primary" />
                ) : (
                  <Share2 className="h-3.5 w-3.5" />
                )}
                {copied ? t("playerPage.copied") : t("playerPage.share")}
              </button>
            </div>
          )}
        </div>

        {loading ? (
          <div className="space-y-3">
            <div className="card-surface h-32 animate-pulse rounded-3xl" />
            <div className="card-surface h-64 animate-pulse rounded-3xl" />
            <div className="card-surface h-40 animate-pulse rounded-3xl" />
          </div>
        ) : !card ? (
          <section className="card-surface rounded-3xl p-8 text-center">
            <h1 className="text-lg font-bold">{t("playerPage.notFound")}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{t("playerPage.notFoundHint")}</p>
            <Link
              to="/scout"
              className="mt-4 inline-block rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground"
            >
              {t("playerPage.back")}
            </Link>
          </section>
        ) : (
          <PlayerDetail
            card={card}
            clubLogo={liveClub?.logo ?? null}
            apiPlayerId={Number.isFinite(apiPlayerId) ? apiPlayerId : undefined}
          />
        )}
      </div>
    </AppShell>
  );
}

function PlayerDetail({
  card,
  clubLogo,
  apiPlayerId,
}: {
  card: PlayerCardData;
  clubLogo?: string | null | undefined;
  apiPlayerId?: number | undefined;
}) {
  const { t } = useTranslation();
  const tier = tierStyles[card.tier];

  return (
    <>
      <section className={cn("card-surface relative overflow-hidden rounded-3xl p-4", tier.glow)}>
        <div
          className={cn(
            "pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b to-transparent opacity-25",
            tier.frame,
          )}
        />
        <div className="relative flex items-center gap-4">
          {card.photo ? (
            <img
              src={card.photo}
              alt={card.name}
              className="h-24 w-24 shrink-0 rounded-2xl bg-secondary/50 object-cover"
            />
          ) : (
            <span
              className={cn(
                "grid h-24 w-24 shrink-0 place-items-center rounded-2xl bg-gradient-to-br text-3xl",
                tier.frame,
              )}
            >
              {card.nation}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-xl font-bold">{card.name}</h1>
            <p className="flex items-center gap-1.5 truncate text-sm text-muted-foreground">
              {clubLogo ? (
                <img
                  src={clubLogo}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  className="h-4 w-4 shrink-0 object-contain"
                />
              ) : (
                <span>{card.clubBadge}</span>
              )}
              <span className="truncate">{card.club}</span>
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <span className={cn("rounded-full px-2.5 py-0.5 text-[11px] font-bold", tier.chip)}>
                {t(card.tier)}
              </span>
              <span className="rounded-full bg-secondary/60 px-2.5 py-0.5 text-[11px] font-bold">
                {card.position}
              </span>
              {card.league && (
                <span className="rounded-full bg-secondary/60 px-2.5 py-0.5 text-[11px] font-semibold text-muted-foreground">
                  {card.league}
                </span>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="card-surface rounded-3xl py-3">
        <RadarChart core={card.core} />
      </section>

      <section>
        <h2 className="mb-2 text-xs font-bold uppercase tracking-wide text-accent">
          {t("playerPage.snapshot")}
        </h2>
        <div className="grid grid-cols-2 gap-1.5">
          <InfoRow icon={Activity} label={t("playerPage.form")} value={String(card.form)} />
          <InfoRow
            icon={TrendingUp}
            label={t("playerPage.goals")}
            value={String(card.careerGoals)}
          />
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-xs font-bold uppercase tracking-wide text-accent">
          {t("information")}
        </h2>
        <div className="grid gap-1.5 sm:grid-cols-2">
          <InfoRow icon={CalendarClock} label={t("age")} value={String(card.age)} />
          <InfoRow icon={Ruler} label={t("height")} value={`${card.heightCm} cm`} />
          <InfoRow icon={Weight} label={t("weight")} value={`${card.weightKg} kg`} />
          <InfoRow icon={Footprints} label={t("preferredFoot")} value={t(card.foot)} />
          <InfoRow icon={TrendingUp} label={t("marketValue")} value={card.marketValue} />
          <InfoRow icon={CalendarClock} label={t("contractUntil")} value={card.contractUntil} />
          <InfoRow
            icon={Activity}
            label={t("injuryHistory")}
            value={card.injuries ?? t("noInjuries")}
          />
        </div>
      </section>

      <TransferTimeline playerId={card.id} apiPlayerId={apiPlayerId} />

      <div className="card-surface space-y-1 rounded-3xl p-4">
        <AttributeList titleKey="technical" attrs={card.technical} />
        <AttributeList titleKey="physicalCat" attrs={card.physical} />
        <AttributeList titleKey="mental" attrs={card.mental} />
      </div>
    </>
  );
}
