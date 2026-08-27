import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Download, Loader2, Save, Trash2, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { bumpBadgeStat } from "@/lib/badges";
import { AppShell } from "@/components/layout/AppShell";
import { Pitch } from "@/components/squad/Pitch";
import { SlotChip, ManagerSlot, chemColor } from "@/components/squad/SlotChip";
import { PlayerPicker, type PickerTarget } from "@/components/squad/PlayerPicker";
import { SquadExportCard } from "@/components/squad/SquadExportCard";
import {
  BENCH_SLOTS,
  computeChemistry,
  computeRatings,
  emptySquad,
  formationKeys,
  formations,
  loadSquads,
  managerById,
  persistSquads,
  playerById,
  roleFit,
  type FormationKey,
  type SavedSquad,
  type SquadState,
} from "@/lib/squad";
import { type ManagerCardData, type PlayerCardData } from "@/data/football";
import { getPlayerDisplayName } from "@/lib/player-name";
import { getSquadPlayerPool, getWorldPlayerCard } from "@/lib/player-search.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/squad")({
  head: () => ({
    meta: [
      { title: "Squad Builder — Formations & Chemistry | FootCard" },
      {
        name: "description",
        content:
          "Build your dream XI on an interactive pitch: pick formations, fill positions, track team chemistry and share your squad as an image.",
      },
      { property: "og:title", content: "Squad Builder — Formations & Chemistry | FootCard" },
      {
        property: "og:description",
        content:
          "Build your dream XI on an interactive pitch: formations, chemistry engine, bench, manager slot and shareable squad export.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Page,
});

function Page() {
  const { t } = useTranslation();
  const [squad, setSquad] = useState<SquadState>(() => emptySquad("4-3-3"));
  const [target, setTarget] = useState<PickerTarget | null>(null);
  const [saved, setSaved] = useState<SavedSquad[]>([]);
  const [busy, setBusy] = useState(false);
  const [autofilling, setAutofilling] = useState(false);
  const [drag, setDrag] = useState<{ slot: string; x: number; y: number } | null>(null);
  const exportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSaved(loadSquads());
  }, []);

  const chem = useMemo(() => computeChemistry(squad), [squad]);
  const ratings = useMemo(() => computeRatings(squad), [squad]);
  const usedIds = useMemo(
    () => [...Object.values(squad.starters), ...squad.bench].filter((v): v is string => !!v),
    [squad],
  );

  const setFormation = (formation: FormationKey) =>
    setSquad((prev) => {
      const prevList = formations[prev.formation].map((n) => prev.starters[n.id] ?? null);
      const starters: Record<string, string | null> = {};
      formations[formation].forEach((n, i) => {
        starters[n.id] = prevList[i] ?? null;
      });
      return { ...prev, formation, starters };
    });

  const currentId =
    target?.kind === "starter"
      ? (squad.starters[target.slotId] ?? null)
      : target?.kind === "bench"
        ? (squad.bench[target.index] ?? null)
        : target?.kind === "manager"
          ? squad.managerId
          : null;

  const assign = (id: string | null) => {
    if (!target) return;
    setSquad((prev) => {
      if (target.kind === "manager") return { ...prev, managerId: id };
      // remove the player from any other slot first
      const starters = { ...prev.starters };
      const bench = [...prev.bench];
      if (id) {
        for (const k of Object.keys(starters)) if (starters[k] === id) starters[k] = null;
        for (let i = 0; i < bench.length; i += 1) if (bench[i] === id) bench[i] = null;
      }
      if (target.kind === "starter") starters[target.slotId] = id;
      else bench[target.index] = id;
      return { ...prev, starters, bench };
    });
    setTarget(null);
  };

  const assignCard = (card: PlayerCardData) => {
    setSquad((prev) => ({ ...prev, extras: { ...prev.extras, [card.id]: card } }));
    assign(card.id);
  };

  const assignManager = (card: ManagerCardData) => {
    setSquad((prev) => ({
      ...prev,
      managerExtras: { ...prev.managerExtras, [card.id]: card },
      managerId: card.id,
    }));
    setTarget(null);
  };

  const swapSlots = (from: string, to: string) => {
    if (from === to) return;
    setSquad((prev) => {
      const starters = { ...prev.starters };
      const bench = [...prev.bench];
      const get = (s: string) => (s.startsWith("b:") ? bench[Number(s.slice(2))] ?? null : starters[s] ?? null);
      const set = (s: string, v: string | null) => {
        if (s.startsWith("b:")) bench[Number(s.slice(2))] = v;
        else starters[s] = v;
      };
      const a = get(from);
      const b = get(to);
      set(from, b);
      set(to, a);
      return { ...prev, starters, bench };
    });
  };

  const onDragStart = (slotId: string, e: React.PointerEvent) => {
    const startX = e.clientX;
    const startY = e.clientY;
    let moved = false;
    const move = (ev: PointerEvent) => {
      if (!moved && Math.hypot(ev.clientX - startX, ev.clientY - startY) < 8) return;
      moved = true;
      setDrag({ slot: slotId, x: ev.clientX, y: ev.clientY });
    };
    const up = (ev: PointerEvent) => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      setDrag(null);
      if (!moved) return;
      const el = document.elementFromPoint(ev.clientX, ev.clientY);
      const dropSlot = el?.closest("[data-slot]")?.getAttribute("data-slot");
      if (dropSlot) swapSlots(slotId, dropSlot);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  const autoFill = async () => {
    if (autofilling) return;
    setAutofilling(true);
    try {
      const pool = await getSquadPlayerPool();
      const nodes = formations[squad.formation];
      const starters = { ...squad.starters };

      // Players already on the pitch or bench (real ids are "sm-{smId}").
      const usedSmIds = new Set<number>();
      for (const id of [...Object.values(squad.starters), ...squad.bench]) {
        if (id && id.startsWith("sm-")) usedSmIds.add(Number(id.slice(3)));
      }

      // Pick the best-fit real player for each empty slot (skip ids in use).
      const selection: { slotId: string; smId: number }[] = [];
      for (const node of nodes) {
        if (starters[node.id]) continue;
        const best = pool
          .filter((p) => !usedSmIds.has(p.smId) && roleFit(node.role, p.position) > 0)
          .sort(
            (a, b) =>
              roleFit(node.role, b.position) - roleFit(node.role, a.position) ||
              (b.rating ?? 0) - (a.rating ?? 0),
          )[0];
        if (best) {
          selection.push({ slotId: node.id, smId: best.smId });
          usedSmIds.add(best.smId);
        }
      }

      // Resolve every selected id into a full card (cached server calls).
      const cards = await Promise.all(
        selection.map((s) => getWorldPlayerCard({ data: { playerId: s.smId } })),
      );
      const extras = { ...squad.extras };
      selection.forEach((s, i) => {
        const card = cards[i]?.data?.card;
        if (card) {
          extras[card.id] = card;
          starters[s.slotId] = card.id;
        }
      });

      setSquad((prev) => ({ ...prev, starters, extras }));
    } catch {
      toast.error(t("cmp.exportFailed"));
    } finally {
      setAutofilling(false);
    }
  };

  const saveSquad = () => {
    bumpBadgeStat("squadsSaved");
    const entry: SavedSquad = {
      ...squad,
      name: squad.name.trim() || t("sq.mySquad"),
      id: `${Date.now()}`,
      savedAt: Date.now(),
    };
    const next = [entry, ...saved].slice(0, 12);
    setSaved(next);
    persistSquads(next);
    toast.success(t("sq.saved"));
  };

  const removeSaved = (id: string) => {
    const next = saved.filter((s) => s.id !== id);
    setSaved(next);
    persistSquads(next);
  };

  const handleExport = async () => {
    if (!exportRef.current) return;
    setBusy(true);
    try {
      const { default: html2canvas } = await import("html2canvas-pro");
      const canvas = await html2canvas(exportRef.current, { scale: 2, backgroundColor: null });
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob((b) => resolve(b), "image/png"),
      );
      if (!blob) throw new Error("canvas.toBlob returned null");
      const file = new File([blob], `footcard-squad-${squad.formation}.png`, {
        type: "image/png",
      });
      const title = squad.name.trim() || "FootCard Squad";
      const text = t("sq.shareText", "My FootCard squad — built with FootCard.");

      // Native share sheet (WhatsApp, Instagram, X, ...) when the browser
      // supports sharing files.
      if (
        typeof navigator.share === "function" &&
        typeof navigator.canShare === "function" &&
        navigator.canShare({ files: [file] })
      ) {
        try {
          await navigator.share({ files: [file], title, text });
          toast.success(t("sq.shared", "Squad shared"));
        } catch (err) {
          // User dismissed the share sheet — not an error, no toast.
          if (err instanceof DOMException && err.name === "AbortError") return;
          // Any other share failure falls through to the download fallback.
          const url = URL.createObjectURL(file);
          const link = document.createElement("a");
          link.download = file.name;
          link.href = url;
          link.click();
          URL.revokeObjectURL(url);
          toast.success(t("sq.downloaded"));
        }
        return;
      }

      // Fallback: auto-download the PNG.
      const url = URL.createObjectURL(file);
      const link = document.createElement("a");
      link.download = file.name;
      link.href = url;
      link.click();
      URL.revokeObjectURL(url);
      toast.success(t("sq.downloaded"));
    } catch {
      toast.error(t("cmp.exportFailed"));
    } finally {
      setBusy(false);
    }
  };

  const dragPlayer = drag
    ? playerById(
        drag.slot.startsWith("b:")
          ? (squad.bench[Number(drag.slot.slice(2))] ?? null)
          : (squad.starters[drag.slot] ?? null),
        squad.extras,
      )
    : null;

  return (
    <AppShell>
      <section className="space-y-5 pb-4">
        <header>
          <h1 className="text-2xl font-bold">{t("nav.squad")}</h1>
          <p className="text-sm text-muted-foreground">{t("sq.subtitle")}</p>
        </header>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={squad.formation}
            onChange={(e) => setFormation(e.target.value as FormationKey)}
            className="rounded-xl border border-border bg-secondary/40 px-3 py-2 text-sm font-bold outline-none focus:border-primary/60"
            aria-label={t("sq.formation")}
          >
            {formationKeys.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
          <input
            value={squad.name}
            onChange={(e) => setSquad((p) => ({ ...p, name: e.target.value }))}
            placeholder={t("sq.squadName")}
            className="min-w-0 flex-1 rounded-xl border border-border bg-secondary/40 px-3 py-2 text-sm outline-none focus:border-primary/60"
          />
          <button
            onClick={() => void autoFill()}
            disabled={autofilling}
            className="flex items-center gap-1.5 rounded-xl bg-primary/15 px-3 py-2 text-xs font-bold text-primary disabled:opacity-60"
          >
            {autofilling ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}{" "}
            {t("sq.autoFill")}
          </button>
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
          <Pitch
            squad={squad}
            chem={chem}
            onSlot={(slotId) => {
              const node = formations[squad.formation].find((n) => n.id === slotId);
              if (node) setTarget({ kind: "starter", slotId, role: node.role });
            }}
            onDragStart={onDragStart}
          />

          <div className="space-y-4">
            <div className="card-surface rounded-2xl p-4">
              <div className="flex items-end justify-between">
                <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  {t("sq.chemistry")}
                </span>
                <span className={cn("text-3xl font-black leading-none", chemColor(chem.total))}>
                  {chem.total}
                </span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all"
                  style={{ width: `${chem.total}%` }}
                />
              </div>
              <div className="mt-3 grid grid-cols-4 gap-2 text-center">
                {[
                  { label: t("sq.att"), value: ratings.att },
                  { label: t("sq.mid"), value: ratings.mid },
                  { label: t("sq.def"), value: ratings.def },
                  { label: t("sq.avgAge"), value: ratings.avgAge },
                ].map((s) => (
                  <div key={s.label} className="rounded-xl bg-secondary/40 py-2">
                    <div className="text-[10px] font-bold uppercase text-muted-foreground">{s.label}</div>
                    <div className="text-lg font-black">{s.value}</div>
                  </div>
                ))}
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground">
                {t("sq.squadValue")}: €{ratings.valueM}M · {chem.filled}/11
              </p>
            </div>

            <ManagerSlot
              managerName={managerById(squad.managerId, squad.managerExtras)?.name ?? null}
              onClick={() => setTarget({ kind: "manager" })}
            />

            <div className="card-surface rounded-2xl p-3">
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                {t("sq.bench")}
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {Array.from({ length: BENCH_SLOTS }, (_, i) => (
                  <SlotChip
                    key={i}
                    slotId={`b:${i}`}
                    role={t("sq.sub")}
                    playerId={squad.bench[i] ?? null}
                    extras={squad.extras}
                    onClick={() => setTarget({ kind: "bench", index: i })}
                    onDragStart={onDragStart}
                  />
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={saveSquad}
                className="flex items-center justify-center gap-2 rounded-2xl bg-secondary/60 px-4 py-3 text-sm font-bold"
              >
                <Save className="h-4 w-4" /> {t("sq.save")}
              </button>
              <button
                onClick={handleExport}
                disabled={busy}
                className="flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-primary to-accent px-4 py-3 text-sm font-black text-background disabled:opacity-70"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                {busy ? t("cmp.generating") : t("sq.share")}
              </button>
            </div>

            {saved.length > 0 && (
              <div className="card-surface rounded-2xl p-3">
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  {t("sq.savedSquads")}
                </p>
                <ul className="space-y-1.5">
                  {saved.map((s) => (
                    <li key={s.id} className="flex items-center gap-2">
                      <button
                        onClick={() => setSquad({ ...s })}
                        className="min-w-0 flex-1 truncate rounded-xl bg-secondary/40 px-3 py-2 text-start text-xs font-bold"
                      >
                        {s.name} · {s.formation}
                      </button>
                      <button
                        onClick={() => removeSaved(s.id)}
                        aria-label={t("sq.delete")}
                        className="rounded-xl bg-destructive/15 p-2 text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </section>

      {drag && dragPlayer && (
        <div
          className="pointer-events-none fixed z-50 -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-primary px-3 py-1.5 text-xs font-black text-primary-foreground shadow-lg"
          style={{ left: drag.x, top: drag.y }}
        >
          {getPlayerDisplayName(dragPlayer)}
        </div>
      )}

      <PlayerPicker
        target={target}
        usedIds={usedIds}
        currentId={currentId}
        onPickWorld={assignCard}
        onPickManager={assignManager}
        onClear={() => assign(null)}
        onClose={() => setTarget(null)}
      />

      <div className="pointer-events-none fixed -left-[10000px] top-0" aria-hidden="true">
        <SquadExportCard ref={exportRef} squad={squad} chem={chem} ratings={ratings} />
      </div>
    </AppShell>
  );
}
