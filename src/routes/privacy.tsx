import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  Cookie,
  Database,
  Globe,
  Lock,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { getPageBySlug } from "@/lib/cms.functions";

const iconMap: Record<string, LucideIcon> = {
  Database,
  Cookie,
  Globe,
  Lock,
  ShieldCheck,
};

interface PageBlock {
  icon?: keyof typeof iconMap;
  title: string;
  text: string;
}

export const Route = createFileRoute("/privacy")({
  loader: async () => {
    const page = await getPageBySlug({ data: { slug: "privacy" } });
    if (!page) throw notFound();
    return page;
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.title ?? "Privacy Policy"} — FootCard` },
      {
        name: "description",
        content:
          (loaderData?.meta_description as string | undefined) ??
          "How FootCard collects, stores and protects your data.",
      },
      { property: "og:title", content: `${loaderData?.title ?? "Privacy Policy"} — FootCard` },
      {
        property: "og:description",
        content:
          (loaderData?.meta_description as string | undefined) ??
          "How FootCard collects, stores and protects your data.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  const { t } = useTranslation();
  const page = Route.useLoaderData();
  const body = (page.body ?? {}) as { blocks?: PageBlock[] };
  const sections = body.blocks ?? [];

  return (
    <AppShell>
      <article className="space-y-6">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> {t("nav.home")}
        </Link>

        <header className="space-y-1">
          <h1 className="text-2xl font-bold">{page.title}</h1>
          <p className="text-sm text-muted-foreground">Last updated: January 2026</p>
        </header>

        <section className="space-y-3">
          {sections.map(({ icon, title, text }) => {
            const Icon = icon ? iconMap[icon] : null;
            return (
              <div key={title} className="card-surface rounded-2xl p-4">
                <div className="flex items-center gap-2">
                  {Icon && (
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary">
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
      </article>
    </AppShell>
  );
}
