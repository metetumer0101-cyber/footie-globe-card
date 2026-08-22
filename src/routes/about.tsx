import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  GitCompareArrows,
  Languages,
  Radar,
  Trophy,
  Users,
  type LucideIcon,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import brandIcon from "@/assets/footcard-icon.png";
import { getPageBySlug } from "@/lib/cms.functions";

const iconMap: Record<string, LucideIcon> = {
  Users,
  GitCompareArrows,
  Radar,
  Trophy,
  Languages,
};

interface PageBlock {
  icon?: keyof typeof iconMap;
  title: string;
  text: string;
}

export const Route = createFileRoute("/about")({
  loader: async () => {
    const page = await getPageBySlug({ data: { slug: "about" } });
    if (!page) throw notFound();
    return page;
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.title ?? "About"} — FootCard` },
      {
        name: "description",
        content:
          (loaderData?.meta_description as string | undefined) ??
          "Learn about FootCard: the football scouting and player card platform.",
      },
      { property: "og:title", content: `${loaderData?.title ?? "About"} — FootCard` },
      {
        property: "og:description",
        content:
          (loaderData?.meta_description as string | undefined) ??
          "The football scouting platform: cards, comparisons, squads and live matches.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AboutPage,
});

function AboutPage() {
  const { t } = useTranslation();
  const page = Route.useLoaderData();
  const body = (page.body ?? {}) as { blocks?: PageBlock[] };
  const pillars = body.blocks ?? [];

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
          {pillars.map(({ icon, title, text }) => {
            const Icon = icon ? iconMap[icon] : null;
            return (
              <div key={title} className="card-surface rounded-2xl p-4">
                <div className="flex items-center gap-2">
                  {Icon && (
                    <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary/15 text-primary">
                      <Icon className="h-4.5 w-4.5" />
                    </span>
                  )}
                  <h2 className="text-sm font-bold">{title}</h2>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{text}</p>
              </div>
            );
          })}
        </section>

        <p className="text-center text-xs text-muted-foreground/70">{t("footer.dataNote")}</p>
      </article>
    </AppShell>
  );
}
