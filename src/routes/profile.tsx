import { createFileRoute } from "@tanstack/react-router";
import { UserRound } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { PagePlaceholder } from "@/components/layout/PagePlaceholder";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Profile — FootCard" },
      { name: "description", content: "Your FootCard profile, saved cards and scouting activity." },
      { property: "og:title", content: "Profile — FootCard" },
      { property: "og:description", content: "Your FootCard profile, saved cards and scouting activity." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <AppShell>
      <PagePlaceholder titleKey="nav.profile" icon={UserRound} />
    </AppShell>
  );
}
