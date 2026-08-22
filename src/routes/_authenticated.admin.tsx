import { useEffect } from "react";
import { createFileRoute, Link, Outlet, redirect, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  CreditCard,
  FileText,
  Languages,
  LayoutDashboard,
  Loader2,
  Megaphone,
  Shield,
  ShieldCheck,
  Users,
} from "lucide-react";
import { getCurrentUserRole } from "@/lib/admin.functions";
import { supabase } from "@/integrations/supabase/client";
import { AdminRoleProvider } from "@/components/admin/role-context";

export const Route = createFileRoute("/_authenticated/admin")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
  },
  component: AdminLayout,
});

const nav = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, adminOnly: false },
  { to: "/admin/cards", label: "Cards", icon: CreditCard, adminOnly: false },
  { to: "/admin/pages", label: "Pages", icon: FileText, adminOnly: false },
  { to: "/admin/announcements", label: "Announcements", icon: Megaphone, adminOnly: false },
  { to: "/admin/translations", label: "Translations", icon: Languages, adminOnly: false },
  { to: "/admin/users", label: "Users & Roles", icon: Users, adminOnly: true },
];

function AdminLayout() {
  const navigate = useNavigate();
  const loadRole = useServerFn(getCurrentUserRole);
  const { data, isLoading } = useQuery({
    queryKey: ["admin-role"],
    queryFn: () => loadRole(),
    staleTime: 30_000,
  });

  const isAdmin = Boolean(data?.isAdmin);
  const isModerator = Boolean(data?.isModerator);

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

  if (!isAdmin && !isModerator) return null;

  return (
    <AdminRoleProvider value={{ isAdmin, isModerator }}>
      <div className="flex min-h-screen bg-background text-foreground">
        <aside className="w-64 shrink-0 border-r border-border bg-surface p-5">
          <h1 className="text-xl font-black tracking-tight">
            Foot<span className="text-primary">Card</span> Admin
          </h1>
          <div className="mt-3">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${
                isAdmin
                  ? "bg-primary/15 text-primary"
                  : "bg-amber-500/15 text-amber-500"
              }`}
            >
              {isAdmin ? <ShieldCheck className="h-3.5 w-3.5" /> : <Shield className="h-3.5 w-3.5" />}
              {isAdmin ? "Admin" : "Moderator"}
            </span>
          </div>
          <nav className="mt-8 space-y-1">
            {nav
              .filter((item) => !item.adminOnly || isAdmin)
              .map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  activeOptions={{ exact: item.to === "/admin" }}
                  activeProps={{ className: "bg-primary/15 text-primary" }}
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors hover:bg-secondary/60"
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              ))}
          </nav>
          {!isAdmin && (
            <p className="mt-8 rounded-xl bg-secondary/40 p-3 text-xs leading-relaxed text-muted-foreground">
              Moderators can create and edit content. Deleting content and managing roles requires
              an admin.
            </p>
          )}
        </aside>
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </AdminRoleProvider>
  );
}
