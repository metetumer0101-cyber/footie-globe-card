import { createFileRoute, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { ArrowLeft, GitCompareArrows, Languages, Radar, Trophy, Users } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import brandIcon from "@/assets/footcard-icon.png";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About — FootCard" },
      { name: "description", content: "Learn about FootCard: the football scouting and player card platform." },
      { property: "og:title", content: "About — FootCard" },
      { property: "og:description", content: "The football scouting platform: cards, comparisons, squads and live matches." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AboutPage,
});

const pillars = [
  { icon: Users, title: "Player & Manager Cards", text: "Two-stage interactive cards with tier frames, 6 core attributes and 30+ deep analytics — no overall rating, just pure detail." },
  { icon: GitCompareArrows, title: "Comparison Engine", text: "Head-to-head radar overlays for players, managers and teams, with social-ready image export." },
  { icon: Radar, title: "Scout Engine", text: "Multi-parametric search across the FootCard picks and the worldwide player database — filter by age, value, contract, stats and more." },
  { icon: Trophy, title: "Live Center & Games", text: "Real fixtures with 30-second auto-refresh, plus daily puzzles, XP and global leaderboards." },
  { icon: Languages, title: "35 Languages", text: "Fully localized experience for the top football nations, including RTL support." },
];

function AboutPage() {
  const { t } = useTranslation();
  return (
    <AppShell>
      <article className="space-y-6">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> {t("nav.home")}
        </Link>

        <header className="card-surface rounded-3xl p-6 text-center sm:p-10">
          <img src={brandIcon} alt="FootCard logo" width={80} height={80} className="mx-auto h-20 w-20 rounded-2xl" />
          <h1 className="mt-4 text-3xl font-black tracking-tight">
            Foot<span className="text-primary">Card</span>
          </h1>
          <p className="mx-auto mt-2 max-w-lg text-sm text-muted-foreground">{t("footer.tagline")}</p>
        </header>

        <section className="grid gap-3 sm:grid-cols-2">
          {pillars.map(({ icon: Icon, title, text }) => (
            <div key={title} className="card-surface rounded-2xl p-4">
              <div className="flex items-center gap-2">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary/15 text-primary">
                  <Icon className="h-4.5 w-4.5" />
                </span>
                <h2 className="text-sm font-bold">{title}</h2>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{text}</p>
            </div>
          ))}
        </section>

        <p className="text-center text-xs text-muted-foreground/70">{t("footer.dataNote")}</p>
      </article>
    </AppShell>
  );
}
