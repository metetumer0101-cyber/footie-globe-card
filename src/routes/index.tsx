import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { AppShell } from "@/components/layout/AppShell";
import { HeroBanner } from "@/components/home/HeroBanner";
import { LiveWidget } from "@/components/home/LiveWidget";
import { ForYouSection } from "@/components/home/ForYouSection";
import { SectionRow } from "@/components/home/SectionRow";
import { PlayerFrontCard } from "@/components/cards/PlayerFrontCard";
import { ManagerFrontCard } from "@/components/cards/ManagerFrontCard";
import { CardDetailModal } from "@/components/analytics/CardDetailModal";
import { players, managers, teams, type CardData } from "@/data/football";
import { activeCompetitions } from "@/components/home/data";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "FootCard — Football Scout & Player Cards" },
      {
        name: "description",
        content:
          "Discover player cards, scout future stars, compare footballers and build your squad in 35 languages.",
      },
      { property: "og:title", content: "FootCard — Football Scout & Player Cards" },
      {
        property: "og:description",
        content: "Scout players, compare stats and build squads on a mobile-first football platform.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [selected, setSelected] = useState<CardData | null>(null);

  const futureStars = players.filter((p) => p.age <= 21);
  const openPlayer = (id: string) => void navigate({ to: "/player/$id", params: { id } });

  return (
    <AppShell>
      <HeroBanner onOpen={() => openPlayer("arda")} />

      <LiveWidget />

      <ForYouSection />


      <SectionRow titleKey="popularPlayers">
        {players.map((p) => (
          <PlayerFrontCard key={p.id} player={p} onClick={() => openPlayer(p.id)} />
        ))}
      </SectionRow>

      <SectionRow titleKey="manager">
        {managers.map((m) => (
          <ManagerFrontCard key={m.id} manager={m} onClick={() => setSelected(m)} />
        ))}
      </SectionRow>

      <SectionRow titleKey="popularTeams">
        {teams.map((team) => (
          <Link
            key={team.id}
            to="/team/$id"
            params={{ id: team.id }}
            className="card-surface flex w-36 shrink-0 snap-start flex-col items-center gap-1.5 rounded-2xl p-3 transition-colors hover:bg-secondary/40"
          >
            <span className="grid h-14 w-14 place-items-center rounded-full bg-secondary/50 text-2xl">
              {team.clubBadge}
            </span>
            <h3 className="w-full truncate text-center text-sm font-semibold">{team.name}</h3>
            <p className="w-full truncate text-center text-xs text-muted-foreground">
              {team.league}
            </p>
          </Link>
        ))}
      </SectionRow>

      <SectionRow titleKey="futureStars">
        {futureStars.map((p) => (
          <PlayerFrontCard key={p.id} player={p} onClick={() => openPlayer(p.id)} />
        ))}
      </SectionRow>

      <SectionRow titleKey="activeCompetitions">
        {activeCompetitions.map((c) => (
          <Link
            key={c.id}
            to="/competitions"
            className="card-surface block w-60 shrink-0 snap-start rounded-2xl p-3 transition-colors hover:bg-secondary/40"
          >
            <span className="rounded-lg bg-primary/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary">
              {t("live")}
            </span>
            <h3 className="mt-2 truncate text-sm font-semibold">{c.name}</h3>
            <p className="truncate text-xs text-muted-foreground">
              {c.phase} · {c.entrants}
            </p>
          </Link>
        ))}
      </SectionRow>

      <CardDetailModal card={selected} onOpenChange={(o) => !o && setSelected(null)} />
    </AppShell>
  );
}
