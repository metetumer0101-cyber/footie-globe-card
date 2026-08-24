import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Gamepad2, Construction } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";

export const Route = createFileRoute("/games")({
  head: () => ({
    meta: [
      { title: "Games — FootCard" },
      {
        name: "description",
        content:
          "FootCard Games — a brand new games experience is coming soon.",
      },
      { property: "og:title", content: "Games — FootCard" },
      {
        property: "og:description",
        content: "A brand new games experience is coming soon.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: GamesPage,
});

function GamesPage() {
  const { t } = useTranslation();

  return (
    <AppShell>
      <div className="space-y-5">
        <section className="card-surface rounded-3xl p-4">
          <h1 className="flex items-center gap-2 text-2xl font-extrabold tracking-tight">
            <Gamepad2 className="h-6 w-6 text-primary" /> {t("games.title")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("games.subtitle")}</p>
        </section>

        <section className="card-surface rounded-3xl p-8">
          <div className="flex flex-col items-center justify-center gap-4 py-12 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-secondary/70">
              <Construction className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold">{t("games.comingSoon")}</h2>
              <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
                {t("games.comingSoonDesc")}
              </p>
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
