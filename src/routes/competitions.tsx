import { createFileRoute } from "@tanstack/react-router";
import { Trophy } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { PagePlaceholder } from "@/components/layout/PagePlaceholder";

export const Route = createFileRoute("/competitions")({
  head: () => ({
    meta: [
      { title: "Competitions — FootCard" },
      { name: "description", content: "Join active football competitions and scouting challenges." },
      { property: "og:title", content: "Competitions — FootCard" },
      { property: "og:description", content: "Join active football competitions and scouting challenges." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <AppShell>
      <PagePlaceholder titleKey="nav.competitions" icon={Trophy} />
    </AppShell>
  );
}
