import { useEffect } from "react";
import { createFileRoute, Link, Outlet, redirect, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CreditCard, FileText, Languages, LayoutDashboard, Loader2, Megaphone } from "lucide-react";
import { getCurrentUserRole } from "@/lib/admin.functions";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
  },
  component: AdminLayout,
});

const nav = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { to: "/admin/cards", label: "Cards", icon: CreditCard },
  { to: "/admin/pages", label: "Pages", icon: FileText },
  { to: "/admin/announcements", label: "Announcements", icon: Megaphone },
  { to: "/admin/translations", label: "Translations", icon: Languages },
];

function AdminLayout() {
  const navigate = useNavigate();
  const loadRole = useServerFn(getCurrentUserRole);
  const { data, isLoading } = useQuery({
    queryKey: ["admin-role"],
    queryFn: () => loadRole(),
  });

  useEffect(() => {
    if (!isLoading && data && !data.isAdmin && !data.isModerator) {
      navigate({ to: "/", replace: true });
    }
  }, [isLoading, data, navigate]);

  if (isLoading) {
    return (
      <div className="grid min-h-screen place-items-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!data?.isAdmin && !data?.isModerator) return null;

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <aside className="w-64 shrink-0 border-r border-border bg-surface p-5">
        <h1 className="text-xl font-black tracking-tight">
          Foot<span className="text-primary">Card</span> Admin
        </h1>
        <nav className="mt-8 space-y-1">
          {nav.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              activeProps={{ className: "bg-primary/15 text-primary" }}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors hover:bg-secondary/60"
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <main className="flex-1 overflow-auto p-6">
        <Outlet />
      </main>
    </div>
  );
}
