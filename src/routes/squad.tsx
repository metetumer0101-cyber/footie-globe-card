import { createFileRoute } from "@tanstack/react-router";
import { Users } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { PagePlaceholder } from "@/components/layout/PagePlaceholder";

export const Route = createFileRoute("/squad")({
  head: () => ({
    meta: [
      { title: "Squad Builder — FootCard" },
      { name: "description", content: "Build your dream squad with formations and player cards." },
      { property: "og:title", content: "Squad Builder — FootCard" },
      { property: "og:description", content: "Build your dream squad with formations and player cards." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <AppShell>
      <PagePlaceholder titleKey="nav.squad" icon={Users} />
    </AppShell>
  );
}
