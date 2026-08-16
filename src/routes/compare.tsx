import { createFileRoute } from "@tanstack/react-router";
import { Swords } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { PagePlaceholder } from "@/components/layout/PagePlaceholder";

export const Route = createFileRoute("/compare")({
  head: () => ({
    meta: [
      { title: "Compare — FootCard" },
      { name: "description", content: "Compare football players attribute by attribute, head to head." },
      { property: "og:title", content: "Compare — FootCard" },
      { property: "og:description", content: "Compare football players attribute by attribute, head to head." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <AppShell>
      <PagePlaceholder titleKey="nav.compare" icon={Swords} />
    </AppShell>
  );
}
