import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Edit2, Loader2, Plus, Search, X } from "lucide-react";
import { listTranslations, upsertTranslation } from "@/lib/admin.functions";
import type { Database } from "@/integrations/supabase/types";

export const Route = createFileRoute("/_authenticated/admin/translations")({
  component: AdminTranslationsPage,
});

type TranslationRow = Database["public"]["Tables"]["cms_translations"]["Row"];

const LOCALES = ["en", "tr"];
const NAMESPACES = ["common", "home", "playerPage", "teamPage", "games", "settings"];

function AdminTranslationsPage() {
  const queryClient = useQueryClient();
  const [locale, setLocale] = useState("en");
  const [namespace, setNamespace] = useState("");
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<TranslationRow | null>(null);
  const [creating, setCreating] = useState(false);

  const load = useServerFn(listTranslations);
  const { data, isLoading } = useQuery({
    queryKey: ["admin-translations", locale, namespace],
    queryFn: () => load({ data: { locale, ...(namespace ? { namespace } : {}) } }),
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return data?.rows ?? [];
    return (data?.rows ?? []).filter(
      (r) =>
        r.key.toLowerCase().includes(q) ||
        r.value.toLowerCase().includes(q) ||
        r.namespace.toLowerCase().includes(q),
    );
  }, [data?.rows, search]);

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black">Translations</h1>
          <p className="text-sm text-muted-foreground">Update i18n copy without redeploying.</p>
        </div>
        <button
          onClick={() => setCreating(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground"
        >
          <Plus className="h-4 w-4" /> New key
        </button>
      </header>

      <div className="flex flex-wrap items-center gap-3">
        <select
          value={locale}
          onChange={(e) => setLocale(e.target.value)}
          className="rounded-xl border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
        >
          {LOCALES.map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </select>
        <select
          value={namespace}
          onChange={(e) => setNamespace(e.target.value)}
          className="rounded-xl border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
        >
          <option value="">All namespaces</option>
          {NAMESPACES.map((ns) => (
            <option key={ns} value={ns}>
              {ns}
            </option>
          ))}
        </select>
        <label className="card-surface flex items-center gap-2 rounded-xl px-3 py-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search key or value"
            className="min-w-[12rem] bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </label>
      </div>

      {isLoading ? (
        <div className="grid place-items-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="card-surface overflow-hidden rounded-2xl">
          <table className="w-full text-sm">
            <thead className="bg-secondary/40 text-left text-xs font-bold uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Namespace</th>
                <th className="px-4 py-3">Key</th>
                <th className="px-4 py-3">Value</th>
                <th className="px-4 py-3 text-right">Edit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((row) => (
                <tr key={row.id} className="hover:bg-secondary/20">
                  <td className="px-4 py-3 text-muted-foreground">{row.namespace}</td>
                  <td className="px-4 py-3 font-mono text-xs">{row.key}</td>
                  <td className="px-4 py-3">{row.value}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => setEditing(row)} className="rounded-lg p-2 hover:bg-secondary">
                      <Edit2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {!filtered.length && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                    No translations found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {(editing || creating) && (
        <TranslationEditor
          locale={locale}
          initial={editing}
          onClose={() => {
            setEditing(null);
            setCreating(false);
          }}
          onSaved={() => {
            queryClient.invalidateQueries({ queryKey: ["admin-translations"] });
            setEditing(null);
            setCreating(false);
          }}
        />
      )}
    </div>
  );
}

function TranslationEditor({
  locale,
  initial,
  onClose,
  onSaved,
}: {
  locale: string;
  initial: TranslationRow | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [namespace, setNamespace] = useState(initial?.namespace ?? "common");
  const [key, setKey] = useState(initial?.key ?? "");
  const [value, setValue] = useState(initial?.value ?? "");
  const [saving, setSaving] = useState(false);
  const upsert = useServerFn(upsertTranslation);

  const save = async () => {
    setSaving(true);
    try {
      await upsert({ data: { locale, namespace, key, value } });
      toast.success("Translation saved");
      onSaved();
    } catch {
      toast.error("Failed to save translation");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 p-4 pt-10 backdrop-blur-sm">
      <div className="w-full max-w-xl rounded-3xl bg-background p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-black">{initial ? "Edit translation" : "New translation key"}</h2>
          <button onClick={onClose} className="rounded-lg p-2 hover:bg-secondary">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-5 space-y-4">
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-muted-foreground">Locale</span>
            <select
              value={locale}
              disabled
              className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm disabled:opacity-60"
            >
              {LOCALES.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-muted-foreground">Namespace</span>
            <select
              value={namespace}
              onChange={(e) => setNamespace(e.target.value)}
              disabled={Boolean(initial)}
              className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary disabled:opacity-60"
            >
              {NAMESPACES.map((ns) => (
                <option key={ns} value={ns}>
                  {ns}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-muted-foreground">Key</span>
            <input
              value={key}
              onChange={(e) => setKey(e.target.value)}
              disabled={Boolean(initial)}
              className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary disabled:opacity-60"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-muted-foreground">Value</span>
            <textarea
              value={value}
              onChange={(e) => setValue(e.target.value)}
              rows={4}
              className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </label>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button onClick={onClose} className="rounded-xl border border-border bg-surface px-4 py-2 text-sm font-bold">
            Cancel
          </button>
          <button
            onClick={() => void save()}
            disabled={saving || !namespace || !key}
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
