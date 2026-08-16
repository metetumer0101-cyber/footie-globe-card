import { createFileRoute } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { PagePlaceholder } from "@/components/layout/PagePlaceholder";

export const Route = createFileRoute("/scout")({
  head: () => ({
    meta: [
      { title: "Scout — FootCard" },
      { name: "description", content: "Find and shortlist football talents with advanced scouting filters." },
      { property: "og:title", content: "Scout — FootCard" },
      { property: "og:description", content: "Find and shortlist football talents with advanced scouting filters." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <AppShell>
      <PagePlaceholder titleKey="nav.scout" icon={Search} />
    </AppShell>
  );
}
