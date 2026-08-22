import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
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
  X,
} from "lucide-react";
import {
  listCards,
  createCard,
  updateCard,
  deleteCard,
} from "@/lib/admin.functions";
import type { Database } from "@/integrations/supabase/types";

export const Route = createFileRoute("/_authenticated/admin/cards")({
  component: AdminCardsPage,
});

type CardRow = Database["public"]["Tables"]["cms_cards"]["Row"];
type CardInsert = Database["public"]["Tables"]["cms_cards"]["Insert"];

const PAGE_SIZE = 25;

const emptyCard: CardInsert = {
  type: "player",
  slug: "",
  name: "",
  published: true,
  club: "",
  nation: "",
  league: "",
  position: "",
  tier: "bronze",
  age: null,
  api_id: null,
  market_value: "",
  contract_until: "",
  photo: "",
  core: null,
  technical: null,
  physical: null,
  mental: null,
  coach: null,
  stats: null,
};

function AdminCardsPage() {
  const queryClient = useQueryClient();
  const [type, setType] = useState<string>("");
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
          ...(type ? { type: type as CardInsert["type"] } : {}),
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
            setType(e.target.value);
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
                        <DeleteButton slug={row.slug} name={row.name} />
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
        <CardEditor
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
        } catch (e) {
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

function CardEditor({
  initial,
  isNew,
  onClose,
  onSaved,
}: {
  initial: CardInsert | CardRow;
  isNew: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [card, setCard] = useState<CardInsert>(() => ({ ...initial }));
  const [saving, setSaving] = useState(false);
  const create = useServerFn(createCard);
  const update = useServerFn(updateCard);

  const field = <K extends keyof CardInsert>(key: K) => ({
    value: (card[key] ?? "") as string,
    onChange: (value: unknown) => setCard((c) => ({ ...c, [key]: value })),
  });

  const save = async () => {
    setSaving(true);
    try {
      if (isNew) {
        await create({ data: card });
      } else {
        await update({ data: { slug: card.slug as string, data: card as CardInsert } });
      }
      toast.success(isNew ? "Card created" : "Card updated");
      onSaved();
    } catch (e) {
      toast.error("Failed to save card");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 p-4 pt-10 backdrop-blur-sm">
      <div className="w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-3xl bg-background p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-black">{isNew ? "New card" : "Edit card"}</h2>
          <button onClick={onClose} className="rounded-lg p-2 hover:bg-secondary">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Field label="Slug">
            <input
              disabled={!isNew}
              value={card.slug ?? ""}
              onChange={(e) => field("slug").onChange(e.target.value)}
              className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary disabled:opacity-60"
            />
          </Field>
          <Field label="Name">
            <input
              value={card.name ?? ""}
              onChange={(e) => field("name").onChange(e.target.value)}
              className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </Field>
          <Field label="Type">
            <select
              value={card.type ?? "player"}
              onChange={(e) => field("type").onChange(e.target.value)}
              className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
            >
              <option value="player">Player</option>
              <option value="manager">Manager</option>
              <option value="team">Team</option>
            </select>
          </Field>
          <Field label="Tier">
            <select
              value={card.tier ?? "bronze"}
              onChange={(e) => field("tier").onChange(e.target.value)}
              className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
            >
              <option value="bronze">Bronze</option>
              <option value="silver">Silver</option>
              <option value="gold">Gold</option>
              <option value="elite">Elite</option>
              <option value="icon">Icon</option>
            </select>
          </Field>
          <Field label="Club">
            <input
              value={card.club ?? ""}
              onChange={(e) => field("club").onChange(e.target.value)}
              className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </Field>
          <Field label="League">
            <input
              value={card.league ?? ""}
              onChange={(e) => field("league").onChange(e.target.value)}
              className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </Field>
          <Field label="Nation">
            <input
              value={card.nation ?? ""}
              onChange={(e) => field("nation").onChange(e.target.value)}
              className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </Field>
          <Field label="Position">
            <input
              value={card.position ?? ""}
              onChange={(e) => field("position").onChange(e.target.value)}
              className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </Field>
          <Field label="API-Football ID">
            <input
              type="number"
              value={card.api_id ?? ""}
              onChange={(e) =>
                field("api_id").onChange(e.target.value ? Number(e.target.value) : null)
              }
              className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </Field>
          <Field label="Age">
            <input
              type="number"
              value={card.age ?? ""}
              onChange={(e) =>
                field("age").onChange(e.target.value ? Number(e.target.value) : null)
              }
              className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </Field>
          <Field label="Market value">
            <input
              value={card.market_value ?? ""}
              onChange={(e) => field("market_value").onChange(e.target.value)}
              className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </Field>
          <Field label="Contract until">
            <input
              value={card.contract_until ?? ""}
              onChange={(e) => field("contract_until").onChange(e.target.value)}
              className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </Field>
          <Field label="Photo URL">
            <input
              value={card.photo ?? ""}
              onChange={(e) => field("photo").onChange(e.target.value)}
              className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </Field>
          <Field label="Published">
            <select
              value={card.published ? "true" : "false"}
              onChange={(e) => field("published").onChange(e.target.value === "true")}
              className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
            >
              <option value="true">Published</option>
              <option value="false">Draft</option>
            </select>
          </Field>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded-xl border border-border bg-surface px-4 py-2 text-sm font-bold"
          >
            Cancel
          </button>
          <button
            onClick={() => void save()}
            disabled={saving || !card.slug || !card.name}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground disabled:opacity-60"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
