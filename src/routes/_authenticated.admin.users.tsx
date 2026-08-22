import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Loader2, Search, ShieldAlert } from "lucide-react";
import {
  assignRole,
  listUsersWithRoles,
  revokeRole,
} from "@/lib/admin.functions";
import { useAdminRole } from "@/components/admin/role-context";

export const Route = createFileRoute("/_authenticated/admin/users")({
  component: AdminUsersPage,
});

const PAGE_SIZE = 25;

function AdminUsersPage() {
  const { isAdmin } = useAdminRole();

  if (!isAdmin) {
    return (
      <div className="grid place-items-center py-24 text-center">
        <div>
          <ShieldAlert className="mx-auto h-10 w-10 text-amber-500" />
          <h1 className="mt-4 text-xl font-black">Admins only</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            User and role management is restricted to admin accounts.
          </p>
        </div>
      </div>
    );
  }

  return <UsersManager />;
}

function UsersManager() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const load = useServerFn(listUsersWithRoles);
  const { data, isLoading } = useQuery({
    queryKey: ["admin-users", search, page],
    queryFn: () =>
      load({ data: { ...(search ? { search } : {}), page, limit: PAGE_SIZE } }),
  });

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil((data?.count ?? 0) / PAGE_SIZE)),
    [data?.count],
  );

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["admin-users"] });

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-black">Users & Roles</h1>
        <p className="text-sm text-muted-foreground">
          Grant or revoke admin and moderator access. Changes apply immediately.
        </p>
      </header>

      <label className="card-surface flex w-fit items-center gap-2 rounded-xl px-3 py-2">
        <Search className="h-4 w-4 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder="Search by name or paste a user ID"
          className="min-w-[16rem] bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
      </label>

      {isLoading ? (
        <div className="grid place-items-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          <div className="card-surface overflow-hidden rounded-2xl">
            <table className="w-full text-sm">
              <thead className="bg-secondary/40 text-left text-xs font-bold uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Roles</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {(data?.rows ?? []).map((row) => (
                  <tr key={row.id} className="hover:bg-secondary/20">
                    <td className="px-4 py-3">
                      <p className="font-semibold">{row.displayName}</p>
                      <p className="font-mono text-xs text-muted-foreground">{row.id}</p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1.5">
                        {row.roles.length === 0 && (
                          <span className="text-xs text-muted-foreground">user</span>
                        )}
                        {row.roles.map((role) => (
                          <span
                            key={role}
                            className={`rounded-full px-2 py-0.5 text-xs font-bold capitalize ${
                              role === "admin"
                                ? "bg-primary/15 text-primary"
                                : "bg-amber-500/15 text-amber-500"
                            }`}
                          >
                            {role}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        {(["admin", "moderator"] as const).map((role) => (
                          <RoleToggle
                            key={role}
                            userId={row.id}
                            role={role}
                            active={row.roles.includes(role)}
                            onChanged={invalidate}
                          />
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
                {!data?.rows?.length && (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center text-muted-foreground">
                      No users found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              {data?.count ?? 0} users · Page {page} of {totalPages}
            </p>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded-xl border border-border bg-surface p-2 disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="rounded-xl border border-border bg-surface p-2 disabled:opacity-40"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function RoleToggle({
  userId,
  role,
  active,
  onChanged,
}: {
  userId: string;
  role: "admin" | "moderator";
  active: boolean;
  onChanged: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const assign = useServerFn(assignRole);
  const revoke = useServerFn(revokeRole);

  return (
    <button
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          if (active) {
            await revoke({ data: { userId, role } });
            toast.success(`Revoked ${role}`);
          } else {
            await assign({ data: { userId, role } });
            toast.success(`Granted ${role}`);
          }
          onChanged();
        } catch (e) {
          toast.error(e instanceof Error ? e.message : "Role change failed");
        } finally {
          setBusy(false);
        }
      }}
      className={`rounded-lg px-3 py-1.5 text-xs font-bold capitalize transition-colors disabled:opacity-50 ${
        active
          ? "bg-destructive/10 text-destructive hover:bg-destructive/20"
          : "bg-secondary hover:bg-secondary/70"
      }`}
    >
      {busy ? "…" : active ? `Revoke ${role}` : `Make ${role}`}
    </button>
  );
}
