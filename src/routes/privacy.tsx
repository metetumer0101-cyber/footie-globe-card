import { createFileRoute, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Cookie, Database, Globe, Lock, ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — FootCard" },
      { name: "description", content: "How FootCard collects, stores and protects your data." },
      { property: "og:title", content: "Privacy Policy — FootCard" },
      { property: "og:description", content: "How FootCard collects, stores and protects your data." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PrivacyPage,
});

const sections = [
  {
    icon: Database,
    title: "Data we store",
    text: "When you create an account we store your email address and profile (display name, XP, badges) in our secure backend. Watchlists, saved squads and language preferences are stored locally in your browser.",
  },
  {
    icon: Cookie,
    title: "Local storage",
    text: "We use browser localStorage for your session, language choice, watchlist and squad builder data. No advertising or third-party tracking cookies are used.",
  },
  {
    icon: Globe,
    title: "Third-party data",
    text: "Live scores, fixtures and player information are provided by API-Football. Requests are proxied through our servers — your device never contacts the provider directly.",
  },
  {
    icon: Lock,
    title: "Security",
    text: "All traffic is encrypted with TLS. Database access is protected by row-level security policies, and authentication is handled by our managed backend with industry-standard practices.",
  },
  {
    icon: ShieldCheck,
    title: "Your rights",
    text: "You can delete your account at any time from your profile page, which removes your stored profile data. Contact us for any privacy question or data request.",
  },
];

function PrivacyPage() {
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

        <header className="space-y-1">
          <h1 className="text-2xl font-bold">{t("footer.privacy")}</h1>
          <p className="text-sm text-muted-foreground">Last updated: January 2026</p>
        </header>

        <section className="space-y-3">
          {sections.map(({ icon: Icon, title, text }) => (
            <div key={title} className="card-surface rounded-2xl p-4">
              <div className="flex items-center gap-2">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary">
                  <Icon className="h-4.5 w-4.5" />
                </span>
                <h2 className="text-sm font-bold">{title}</h2>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{text}</p>
            </div>
          ))}
        </section>
      </article>
    </AppShell>
  );
}
