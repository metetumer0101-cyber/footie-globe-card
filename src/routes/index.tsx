import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { HomePage } from "@/components/home/HomePage";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "FootCard — Football Scout & Player Cards" },
      {
        name: "description",
        content:
          "Follow your favorite team, compare footballers and build your squad in 35 languages.",
      },
      { property: "og:title", content: "FootCard — Football Scout & Player Cards" },
      {
        property: "og:description",
        content:
          "Your favorite team's matches, the week's best players and the biggest derbies — a mobile-first football platform.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <AppShell>
      <HomePage />
    </AppShell>
  );
}
