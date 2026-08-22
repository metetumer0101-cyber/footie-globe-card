import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Edit2, Loader2, Plus, Trash2, X } from "lucide-react";
import { listPages, createPage, updatePage, deletePage } from "@/lib/admin.functions";
import type { Database } from "@/integrations/supabase/types";

export const Route = createFileRoute("/_authenticated/admin/pages")({
  component: AdminPagesPage,
});

type PageRow = Database["public"]["Tables"]["cms_pages"]["Row"];
type PageInsert = Database["public"]["Tables"]["cms_pages"]["Insert"];

const emptyPage: PageInsert = {
  slug: "",
  title: "",
  meta_description: "",
  body: {},
  published: true,
};

function AdminPagesPage() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<PageRow | null>(null);
  const [creating, setCreating] = useState(false);
  const load = useServerFn(listPages);
  const { data, isLoading } = useQuery({
    queryKey: ["admin-pages"],
    queryFn: () => load({ data: {} }),
  });

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black">Pages</h1>
          <p className="text-sm text-muted-foreground">Edit static pages like About and Privacy.</p>
        </div>
        <button
          onClick={() => setCreating(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground"
        >
          <Plus className="h-4 w-4" /> New page
        </button>
      </header>

      {isLoading ? (
        <div className="grid place-items-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="card-surface divide-y divide-border rounded-2xl">
          {(data?.rows ?? []).map((row) => (
            <div key={row.id} className="flex items-center justify-between px-5 py-4 hover:bg-secondary/20">
              <div>
                <p className="font-semibold">{row.title}</p>
                <p className="text-xs text-muted-foreground">/{row.slug}</p>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                    row.published
                      ? "bg-emerald-500/15 text-emerald-500"
                      : "bg-amber-500/15 text-amber-500"
                  }`}
                >
                  {row.published ? "Published" : "Draft"}
                </span>
                <button onClick={() => setEditing(row)} className="rounded-lg p-2 hover:bg-secondary">
                  <Edit2 className="h-4 w-4" />
                </button>
                <DeleteButton slug={row.slug} title={row.title} />
              </div>
            </div>
          ))}
          {!data?.rows?.length && (
            <p className="px-5 py-8 text-center text-muted-foreground">No pages found.</p>
          )}
        </div>
      )}

      {(editing || creating) && (
        <PageEditor
          initial={editing ?? emptyPage}
          isNew={creating}
          onClose={() => {
            setEditing(null);
            setCreating(false);
          }}
          onSaved={() => {
            queryClient.invalidateQueries({ queryKey: ["admin-pages"] });
            setEditing(null);
            setCreating(false);
          }}
        />
      )}
    </div>
  );
}

function DeleteButton({ slug, title }: { slug: string; title: string }) {
  const queryClient = useQueryClient();
  const del = useServerFn(deletePage);
  return (
    <button
      onClick={async () => {
        if (!confirm(`Delete "${title}"?`)) return;
        try {
          await del({ data: { slug } });
          toast.success("Page deleted");
          queryClient.invalidateQueries({ queryKey: ["admin-pages"] });
        } catch {
          toast.error("Failed to delete page");
        }
      }}
      className="rounded-lg p-2 text-destructive hover:bg-destructive/10"
    >
      <Trash2 className="h-4 w-4" />
    </button>
  );
}

function PageEditor({
  initial,
  isNew,
  onClose,
  onSaved,
}: {
  initial: PageInsert | PageRow;
  isNew: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [page, setPage] = useState<PageInsert>(() => ({ ...initial }));
  const [saving, setSaving] = useState(false);
  const create = useServerFn(createPage);
  const update = useServerFn(updatePage);

  const save = async () => {
    setSaving(true);
    try {
      let body: unknown = page.body;
      if (typeof page.body === "string") {
        body = page.body ? JSON.parse(page.body as string) : {};
      }
      const payload = { ...page, body } as PageInsert;
      if (isNew) {
        await create({ data: payload });
      } else {
        await update({ data: { slug: page.slug as string, data: payload } });
      }
      toast.success(isNew ? "Page created" : "Page updated");
      onSaved();
    } catch {
      toast.error("Failed to save page. Check JSON body.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 p-4 pt-10 backdrop-blur-sm">
      <div className="w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-3xl bg-background p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-black">{isNew ? "New page" : "Edit page"}</h2>
          <button onClick={onClose} className="rounded-lg p-2 hover:bg-secondary">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-5 space-y-4">
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-muted-foreground">Slug</span>
            <input
              disabled={!isNew}
              value={page.slug ?? ""}
              onChange={(e) => setPage((p) => ({ ...p, slug: e.target.value }))}
              className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary disabled:opacity-60"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-muted-foreground">Title</span>
            <input
              value={page.title ?? ""}
              onChange={(e) => setPage((p) => ({ ...p, title: e.target.value }))}
              className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-muted-foreground">
              Meta description
            </span>
            <input
              value={page.meta_description ?? ""}
              onChange={(e) => setPage((p) => ({ ...p, meta_description: e.target.value }))}
              className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-muted-foreground">
              Body (JSON blocks)
            </span>
            <textarea
              value={
                typeof page.body === "string"
                  ? (page.body as string)
                  : JSON.stringify(page.body ?? {}, null, 2)
              }
              onChange={(e) => setPage((p) => ({ ...p, body: e.target.value as unknown as typeof p.body }))}
              rows={10}
              className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm font-mono outline-none focus:border-primary"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-muted-foreground">Status</span>
            <select
              value={page.published ? "true" : "false"}
              onChange={(e) => setPage((p) => ({ ...p, published: e.target.value === "true" }))}
              className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
            >
              <option value="true">Published</option>
              <option value="false">Draft</option>
            </select>
          </label>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button onClick={onClose} className="rounded-xl border border-border bg-surface px-4 py-2 text-sm font-bold">
            Cancel
          </button>
          <button
            onClick={() => void save()}
            disabled={saving || !page.slug || !page.title}
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
