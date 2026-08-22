import { createFileRoute, Link } from "@tanstack/react-router";
import { CreditCard, FileText, Languages, Megaphone } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: AdminDashboard,
});

const cards = [
  { to: "/admin/cards", title: "Cards", desc: "Manage player, manager and team cards.", icon: CreditCard },
  { to: "/admin/pages", title: "Pages", desc: "Edit About, Privacy and other static pages.", icon: FileText },
  { to: "/admin/announcements", title: "Announcements", desc: "Publish banners and news.", icon: Megaphone },
  { to: "/admin/translations", title: "Translations", desc: "Update i18n copy without redeploying.", icon: Languages },
];

function AdminDashboard() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-black">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Manage FootCard content from one place.</p>
      </header>
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map(({ to, title, desc, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            className="card-surface group rounded-2xl p-5 transition-colors hover:bg-secondary/40"
          >
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary/15 text-primary">
              <Icon className="h-5 w-5" />
            </span>
            <h2 className="mt-4 font-bold">{title}</h2>
            <p className="mt-1 text-xs text-muted-foreground">{desc}</p>
          </Link>
        ))}
      </section>
    </div>
  );
}
