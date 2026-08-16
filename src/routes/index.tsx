import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { AppShell } from "@/components/layout/AppShell";
import { HeroBanner } from "@/components/home/HeroBanner";
import { SectionRow } from "@/components/home/SectionRow";
import { PlayerFrontCard } from "@/components/cards/PlayerFrontCard";
import { ManagerFrontCard } from "@/components/cards/ManagerFrontCard";
import { CardDetailModal } from "@/components/analytics/CardDetailModal";
import { players, managers, type CardData } from "@/data/football";
import { popularTeams, activeCompetitions } from "@/components/home/data";

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
  const [selected, setSelected] = useState<CardData | null>(null);

  const futureStars = players.filter((p) => p.age <= 21);

  return (
    <AppShell>
      <HeroBanner onOpen={() => setSelected(players.find((p) => p.id === "arda") ?? null)} />

      <SectionRow titleKey="popularPlayers">
        {players.map((p) => (
          <PlayerFrontCard key={p.id} player={p} onClick={() => setSelected(p)} />
        ))}
      </SectionRow>

      <SectionRow titleKey="manager">
        {managers.map((m) => (
          <ManagerFrontCard key={m.id} manager={m} onClick={() => setSelected(m)} />
        ))}
      </SectionRow>

      <SectionRow titleKey="popularTeams">
        {popularTeams.map((team) => (
          <article
            key={team.id}
            className="card-surface flex w-36 shrink-0 snap-start flex-col items-center gap-1.5 rounded-2xl p-3"
          >
            <span className="grid h-14 w-14 place-items-center rounded-full bg-secondary/50 text-2xl">
              {team.badge}
            </span>
            <h3 className="w-full truncate text-center text-sm font-semibold">{team.name}</h3>
            <p className="w-full truncate text-center text-xs text-muted-foreground">
              {team.league}
            </p>
          </article>
        ))}
      </SectionRow>

      <SectionRow titleKey="futureStars">
        {futureStars.map((p) => (
          <PlayerFrontCard key={p.id} player={p} onClick={() => setSelected(p)} />
        ))}
      </SectionRow>

      <SectionRow titleKey="activeCompetitions">
        {activeCompetitions.map((c) => (
          <article key={c.id} className="card-surface w-60 shrink-0 snap-start rounded-2xl p-3">
            <span className="rounded-lg bg-primary/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary">
              {t("live")}
            </span>
            <h3 className="mt-2 truncate text-sm font-semibold">{c.name}</h3>
            <p className="truncate text-xs text-muted-foreground">
              {c.phase} · {c.entrants}
            </p>
          </article>
        ))}
      </SectionRow>

      <CardDetailModal card={selected} onOpenChange={(o) => !o && setSelected(null)} />
    </AppShell>
  );
}
