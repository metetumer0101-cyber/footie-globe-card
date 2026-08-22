import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Edit2, Loader2, Plus, Trash2, X } from "lucide-react";
import {
  listAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
} from "@/lib/admin.functions";
import type { Database } from "@/integrations/supabase/types";
import { useAdminRole } from "@/components/admin/role-context";

export const Route = createFileRoute("/_authenticated/admin/announcements")({
  component: AdminAnnouncementsPage,
});

type AnnouncementRow = Database["public"]["Tables"]["cms_announcements"]["Row"];
type AnnouncementInsert = Database["public"]["Tables"]["cms_announcements"]["Insert"];

const emptyAnnouncement: AnnouncementInsert = {
  title: "",
  body: "",
  link: "",
  active: true,
  priority: 0,
};

function AdminAnnouncementsPage() {
  const queryClient = useQueryClient();
  const { isAdmin } = useAdminRole();
  const [editing, setEditing] = useState<AnnouncementRow | null>(null);
  const [creating, setCreating] = useState(false);
  const load = useServerFn(listAnnouncements);
  const { data, isLoading } = useQuery({
    queryKey: ["admin-announcements"],
    queryFn: () => load({ data: {} }),
  });

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black">Announcements</h1>
          <p className="text-sm text-muted-foreground">Publish banners and news items.</p>
        </div>
        <button
          onClick={() => setCreating(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground"
        >
          <Plus className="h-4 w-4" /> New announcement
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
                <p className="text-xs text-muted-foreground line-clamp-1">{row.body}</p>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                    row.active
                      ? "bg-emerald-500/15 text-emerald-500"
                      : "bg-amber-500/15 text-amber-500"
                  }`}
                >
                  {row.active ? "Active" : "Inactive"}
                </span>
                <button onClick={() => setEditing(row)} className="rounded-lg p-2 hover:bg-secondary">
                  <Edit2 className="h-4 w-4" />
                </button>
                {isAdmin && <DeleteButton id={row.id} title={row.title} />}
              </div>
            </div>
          ))}
          {!data?.rows?.length && (
            <p className="px-5 py-8 text-center text-muted-foreground">No announcements found.</p>
          )}
        </div>
      )}

      {(editing || creating) && (
        <AnnouncementEditor
          initial={editing ?? emptyAnnouncement}
          isNew={creating}
          onClose={() => {
            setEditing(null);
            setCreating(false);
          }}
          onSaved={() => {
            queryClient.invalidateQueries({ queryKey: ["admin-announcements"] });
            setEditing(null);
            setCreating(false);
          }}
        />
      )}
    </div>
  );
}

function DeleteButton({ id, title }: { id: string; title: string }) {
  const queryClient = useQueryClient();
  const del = useServerFn(deleteAnnouncement);
  return (
    <button
      onClick={async () => {
        if (!confirm(`Delete "${title}"?`)) return;
        try {
          await del({ data: { id } });
          toast.success("Announcement deleted");
          queryClient.invalidateQueries({ queryKey: ["admin-announcements"] });
        } catch {
          toast.error("Failed to delete announcement");
        }
      }}
      className="rounded-lg p-2 text-destructive hover:bg-destructive/10"
    >
      <Trash2 className="h-4 w-4" />
    </button>
  );
}

function AnnouncementEditor({
  initial,
  isNew,
  onClose,
  onSaved,
}: {
  initial: AnnouncementInsert | AnnouncementRow;
  isNew: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [item, setItem] = useState<AnnouncementInsert>(() => ({ ...initial }));
  const [saving, setSaving] = useState(false);
  const create = useServerFn(createAnnouncement);
  const update = useServerFn(updateAnnouncement);

  const save = async () => {
    setSaving(true);
    try {
      if (isNew) {
        await create({ data: item });
      } else {
        await update({ data: { id: (item as AnnouncementRow).id, data: item } });
      }
      toast.success(isNew ? "Announcement created" : "Announcement updated");
      onSaved();
    } catch {
      toast.error("Failed to save announcement");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 p-4 pt-10 backdrop-blur-sm">
      <div className="w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-3xl bg-background p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-black">{isNew ? "New announcement" : "Edit announcement"}</h2>
          <button onClick={onClose} className="rounded-lg p-2 hover:bg-secondary">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-5 space-y-4">
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-muted-foreground">Title</span>
            <input
              value={item.title ?? ""}
              onChange={(e) => setItem((i) => ({ ...i, title: e.target.value }))}
              className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-muted-foreground">Body</span>
            <textarea
              value={item.body ?? ""}
              onChange={(e) => setItem((i) => ({ ...i, body: e.target.value }))}
              rows={4}
              className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-muted-foreground">Link</span>
            <input
              value={item.link ?? ""}
              onChange={(e) => setItem((i) => ({ ...i, link: e.target.value }))}
              className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </label>
          <div className="grid gap-4 sm:grid-cols-3">
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-muted-foreground">Priority</span>
              <input
                type="number"
                value={item.priority ?? 0}
                onChange={(e) => setItem((i) => ({ ...i, priority: Number(e.target.value) }))}
                className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-muted-foreground">Active</span>
              <select
                value={item.active ? "true" : "false"}
                onChange={(e) => setItem((i) => ({ ...i, active: e.target.value === "true" }))}
                className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
              >
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
            </label>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button onClick={onClose} className="rounded-xl border border-border bg-surface px-4 py-2 text-sm font-bold">
            Cancel
          </button>
          <button
            onClick={() => void save()}
            disabled={saving || !item.title}
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
