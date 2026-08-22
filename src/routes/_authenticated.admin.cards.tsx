import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  ChevronLeft,
  ChevronRight,
  Edit2,
  Loader2,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { listCards, deleteCard } from "@/lib/admin.functions";
import type { Database } from "@/integrations/supabase/types";
import { CardForm, emptyCard } from "@/components/admin/CardForm";
import { useAdminRole } from "@/components/admin/role-context";

export const Route = createFileRoute("/_authenticated/admin/cards")({
  component: AdminCardsPage,
});

type CardRow = Database["public"]["Tables"]["cms_cards"]["Row"];

const PAGE_SIZE = 25;

function AdminCardsPage() {
  const queryClient = useQueryClient();
  const { isAdmin } = useAdminRole();
  const [type, setType] = useState<"" | "player" | "manager" | "team">("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<CardRow | null>(null);
  const [creating, setCreating] = useState(false);

  const load = useServerFn(listCards);
  const { data, isLoading } = useQuery({
    queryKey: ["admin-cards", type, search, page],
    queryFn: () =>
      load({
        data: {
          ...(type ? { type: type as "player" | "manager" | "team" } : {}),
          ...(search ? { search } : {}),
          page,
          limit: PAGE_SIZE,
        },
      }),
  });

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil((data?.count ?? 0) / PAGE_SIZE)),
    [data?.count],
  );

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black">Cards</h1>
          <p className="text-sm text-muted-foreground">
            Manage player, manager and team cards.
          </p>
        </div>
        <button
          onClick={() => setCreating(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground"
        >
          <Plus className="h-4 w-4" /> New card
        </button>
      </header>

      <div className="flex flex-wrap items-center gap-3">
        <label className="card-surface flex items-center gap-2 rounded-xl px-3 py-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search name or slug"
            className="min-w-[12rem] bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </label>
        <select
          value={type}
          onChange={(e) => {
            setType(e.target.value as "" | "player" | "manager" | "team");
            setPage(1);
          }}
          className="rounded-xl border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
        >
          <option value="">All types</option>
          <option value="player">Player</option>
          <option value="manager">Manager</option>
          <option value="team">Team</option>
        </select>
      </div>

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
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Club / League</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {(data?.rows ?? []).map((row) => (
                  <tr key={row.id} className="hover:bg-secondary/20">
                    <td className="px-4 py-3 font-semibold">{row.name}</td>
                    <td className="px-4 py-3 capitalize">{row.type}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {row.club || "—"} {row.league ? `· ${row.league}` : ""}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                          row.published
                            ? "bg-emerald-500/15 text-emerald-500"
                            : "bg-amber-500/15 text-amber-500"
                        }`}
                      >
                        {row.published ? "Published" : "Draft"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setEditing(row)}
                          className="rounded-lg p-2 transition-colors hover:bg-secondary"
                          aria-label="Edit"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        {isAdmin && <DeleteButton slug={row.slug} name={row.name} />}
                      </div>
                    </td>
                  </tr>
                ))}
                {!data?.rows?.length && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                      No cards found. Import the catalogue or create a new card.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              {data?.count ?? 0} cards · Page {page} of {totalPages}
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

      {(editing || creating) && (
        <CardForm
          initial={editing ?? emptyCard}
          isNew={creating}
          onClose={() => {
            setEditing(null);
            setCreating(false);
          }}
          onSaved={() => {
            queryClient.invalidateQueries({ queryKey: ["admin-cards"] });
            setEditing(null);
            setCreating(false);
          }}
        />
      )}
    </div>
  );
}

function DeleteButton({ slug, name }: { slug: string; name: string }) {
  const queryClient = useQueryClient();
  const del = useServerFn(deleteCard);
  return (
    <button
      onClick={async () => {
        if (!confirm(`Delete "${name}"?`)) return;
        try {
          await del({ data: { slug } });
          toast.success("Card deleted");
          queryClient.invalidateQueries({ queryKey: ["admin-cards"] });
        } catch {
          toast.error("Failed to delete card");
        }
      }}
      className="rounded-lg p-2 text-destructive transition-colors hover:bg-destructive/10"
      aria-label="Delete"
    >
      <Trash2 className="h-4 w-4" />
    </button>
  );
}
