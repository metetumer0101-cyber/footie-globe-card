import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import {
  ArrowRight,
  Download,
  Flame,
  GitCompareArrows,
  Loader2,
  Search,
  Shirt,
  UserCog,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/AppShell";
import { EntityPicker } from "@/components/compare/EntityPicker";
import { DualRadarChart } from "@/components/compare/DualRadarChart";
import { StatBars, buildRows } from "@/components/compare/StatBars";
import { MatchupCard } from "@/components/compare/MatchupCard";
import {
  findEntity,
  metricsOf,
  radarOf,
  subtitleOf,
  trendingMatchups,
  type Entity,
  type EntityKind,
} from "@/lib/compare";
import { tierStyles } from "@/data/football";
import { listPublishedCards } from "@/lib/cms.functions";
import { mapCardRow } from "@/lib/cms-mappers";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/compare")({
  head: () => ({
    meta: [
      { title: "Compare Players, Managers & Teams — FootCard" },
      {
        name: "description",
        content:
          "Head-to-head football comparison: dual radar overlay, stat-by-stat bars and a shareable matchup card.",
      },
      { property: "og:title", content: "Compare Players, Managers & Teams — FootCard" },
      {
        property: "og:description",
        content:
          "Head-to-head football comparison: dual radar overlay, stat-by-stat bars and a shareable matchup card.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: async () => {
    try {
      const rows = await listPublishedCards({ data: { limit: 1000 } });
      return rows.map(mapCardRow);
    } catch {
      // CMS/Supabase unavailable, or no seed data, during SSR (e.g. missing env vars
      // or a DB error). Render a safe empty state below instead of crashing with a 500.
      return [];
    }
  },
  component: Page,
});

const KINDS: EntityKind[] = ["player", "manager", "team"];
const KIND_LABEL: Record<EntityKind, string> = {
  player: "cmp.players",
  manager: "cmp.managers",
  team: "cmp.teams",
};
const EMPTY_STEPS: {
  icon: LucideIcon;
  titleKey: string;
  descKey: string;
  accent: string;
  ring: string;
}[] = [
  {
    icon: UserRound,
    titleKey: "cmp.stepPvpTitle",
    descKey: "cmp.stepPvpDesc",
    accent: "text-sky-400",
    ring: "bg-sky-400/10 ring-sky-400/20",
  },
  {
    icon: UserCog,
    titleKey: "cmp.stepMvmTitle",
    descKey: "cmp.stepMvmDesc",
    accent: "text-amber-400",
    ring: "bg-amber-400/10 ring-amber-400/20",
  },
  {
    icon: Shirt,
    titleKey: "cmp.stepTvtTitle",
    descKey: "cmp.stepTvtDesc",
    accent: "text-emerald-400",
    ring: "bg-emerald-400/10 ring-emerald-400/20",
  },
];

function Page() {
  const { t } = useTranslation();
  const allCards = Route.useLoaderData();
  const pools = useMemo(() => {
    const out: Record<EntityKind, Entity[]> = { player: [], manager: [], team: [] };
    for (const card of allCards) {
      if (card.type === "player" || card.type === "manager" || card.type === "team") {
        out[card.type].push(card);
      }
    }
    return out;
  }, [allCards]);

  const [kind, setKind] = useState<EntityKind>("player");
  const [ids, setIds] = useState<Record<EntityKind, [string, string]>>({
    player: ["haaland", "mbappe"],
    manager: ["pep", "ancelotti"],
    team: ["real-madrid", "man-city"],
  });
  const [qr, setQr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);

  const [idA, idB] = ids[kind];
  const a = findEntity(kind, idA, pools[kind]);
  const b = findEntity(kind, idB, pools[kind]);
  // Pools can be empty while CMS/seed data isn't loaded yet (e.g. Supabase empty or
  // unavailable during SSR). Guard every derived computation so we render a safe
  // empty state instead of throwing (radarOf/metricsOf crash on undefined entities).
  const ready = !!(a && b);

  const radarA = useMemo(() => (a ? radarOf(a) : []), [a]);
  const radarB = useMemo(() => (b ? radarOf(b) : []), [b]);
  const rows = useMemo(
    () => (ready ? buildRows(radarA, radarB, metricsOf(a, b), t) : []),
    [ready, radarA, radarB, a, b, t],
  );

  useEffect(() => {
    let alive = true;
    import("qrcode").then((m) =>
      m
        .toDataURL("https://footie-globe-card.lovable.app/compare", {
          margin: 1,
          width: 256,
          color: { dark: "#0B0F17", light: "#FFFFFF" },
        })
        .then((url) => {
          if (alive) setQr(url);
        })
        .catch(() => undefined),
    );
    return () => {
      alive = false;
    };
  }, []);

  const setSide = (side: 0 | 1, id: string) =>
    setIds((prev) => {
      const pair: [string, string] = [...prev[kind]] as [string, string];
      pair[side] = id;
      return { ...prev, [kind]: pair };
    });

  const handleExport = async () => {
    if (!exportRef.current) return;
    setBusy(true);
    try {
      const { default: html2canvas } = await import("html2canvas-pro");
      const canvas = await html2canvas(exportRef.current, { scale: 2, backgroundColor: null });
      const link = document.createElement("a");
      link.download = `footcard-${a.id}-vs-${b.id}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      toast.success(t("cmp.downloaded"));
    } catch {
      toast.error(t("cmp.exportFailed"));
    } finally {
      setBusy(false);
    }
  };

  // No cards of this kind are available yet (empty CMS/seed data during SSR).
  // Render a safe empty state instead of crashing on undefined entities.
  if (!ready) {
    return (
      <AppShell>
        <section className="space-y-5">
          <header>
            <h1 className="text-2xl font-bold">{t("cmp.title")}</h1>
            <p className="text-sm text-muted-foreground">{t("cmp.subtitle")}</p>
          </header>

          <div className="card-surface relative overflow-hidden rounded-2xl p-6 sm:p-10">
            {/* soft brand glow in the background */}
            <div
              aria-hidden
              className="pointer-events-none absolute -top-32 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-primary/15 blur-3xl"
            />
            <div
              aria-hidden
              className="pointer-events-none absolute -bottom-24 -right-16 h-48 w-48 rounded-full bg-accent/10 blur-3xl"
            />

            <div className="relative flex flex-col items-center text-center">
              {/* VS motif */}
              <div className="mb-5 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 shadow-inner">
                <UserRound className="h-7 w-7 text-muted-foreground" />
                <GitCompareArrows className="h-9 w-9 text-primary" />
                <UserRound className="h-7 w-7 text-muted-foreground" />
              </div>

              <h2 className="text-xl font-bold sm:text-2xl">{t("cmp.emptyTitle")}</h2>
              <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
                {t("cmp.emptyDesc")}
              </p>

              {/* what you can compare */}
              <div className="mt-7 grid w-full gap-3 sm:grid-cols-3">
                {EMPTY_STEPS.map((step) => {
                  const Icon = step.icon;
                  return (
                    <div
                      key={step.titleKey}
                      className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-left"
                    >
                      <div
                        className={cn(
                          "mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl ring-1",
                          step.ring,
                        )}
                      >
                        <Icon className={cn("h-5 w-5", step.accent)} />
                      </div>
                      <p className="text-sm font-semibold">{t(step.titleKey)}</p>
                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                        {t(step.descKey)}
                      </p>
                    </div>
                  );
                })}
              </div>

              {/* CTA */}
              <div className="mt-8 flex flex-col items-center gap-2.5">
                <Link
                  to="/scout"
                  className="group inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-transform hover:scale-[1.02] active:scale-[0.99]"
                >
                  <Search className="h-4 w-4" />
                  {t("cmp.ctaScout")}
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
                <p className="text-xs text-muted-foreground">{t("cmp.ctaHint")}</p>
              </div>
            </div>
          </div>
        </section>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <section className="space-y-5">
        <header>
          <h1 className="text-2xl font-bold">{t("cmp.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("cmp.subtitle")}</p>
        </header>

        <div className="flex gap-1 rounded-2xl bg-secondary/40 p-1">
          {KINDS.map((k) => (
            <button
              key={k}
              onClick={() => setKind(k)}
              className={cn(
                "flex-1 truncate rounded-xl px-3 py-2 text-xs font-bold transition-colors",
                kind === k ? "bg-primary text-primary-foreground" : "text-muted-foreground",
              )}
            >
              {t(KIND_LABEL[k])}
            </button>
          ))}
        </div>

        <div>
          <p className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">
            <Flame className="h-4 w-4 text-accent" /> {t("cmp.trending")}
          </p>
          <div className="-mx-4 flex snap-x gap-2 overflow-x-auto px-4 pb-1">
            {trendingMatchups.map((m) => {
              const ea = findEntity(m.kind, m.a, pools[m.kind]);
              const eb = findEntity(m.kind, m.b, pools[m.kind]);
              if (!ea || !eb) return null;
              return (
                <button
                  key={`${m.kind}-${m.a}-${m.b}`}
                  onClick={() => {
                    setKind(m.kind);
                    setIds((prev) => ({ ...prev, [m.kind]: [m.a, m.b] }));
                  }}
                  className="card-surface shrink-0 snap-start rounded-2xl px-3 py-2 text-xs font-semibold transition-transform hover:scale-[1.03] active:scale-[0.98]"
                >
                  <span className="text-primary">{ea.name}</span>
                  <span className="mx-1 text-muted-foreground">{t("cmp.vs")}</span>
                  <span className="text-accent">{eb.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <EntityPicker
            side="a"
            label={t("cmp.entityA")}
            pool={pools[kind]}
            value={a}
            onChange={(id) => setSide(0, id)}
          />
          <EntityPicker
            side="b"
            label={t("cmp.entityB")}
            pool={pools[kind]}
            value={b}
            onChange={(id) => setSide(1, id)}
          />
        </div>

        <div className="card-surface grid grid-cols-2 gap-3 rounded-2xl p-3">
          <Head entity={a} tone="primary" />
          <Head entity={b} tone="accent" align="end" />
        </div>

        <div className="card-surface rounded-2xl p-3">
          <h2 className="mb-1 text-sm font-bold">{t("cmp.radarTitle")}</h2>
          <div className="flex items-center justify-center gap-4 text-[11px] font-bold">
            <span className="flex items-center gap-1.5 text-primary">
              <span className="h-2 w-2 rounded-full bg-primary" /> {a.name}
            </span>
            <span className="flex items-center gap-1.5 text-accent">
              <span className="h-2 w-2 rounded-full bg-accent" /> {b.name}
            </span>
          </div>
          <DualRadarChart a={radarA} b={radarB} />
        </div>

        <div className="card-surface rounded-2xl p-3">
          <h2 className="mb-3 text-sm font-bold">{t("cmp.statsTitle")}</h2>
          <StatBars rows={rows} />
        </div>

        <button
          onClick={handleExport}
          disabled={busy}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-primary to-accent px-4 py-3 text-sm font-black text-background transition-transform hover:scale-[1.01] active:scale-[0.99] disabled:opacity-70"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          {busy ? t("cmp.generating") : t("cmp.download")}
        </button>
      </section>

      <div className="pointer-events-none fixed -left-[10000px] top-0" aria-hidden="true">
        <MatchupCard ref={exportRef} a={a} b={b} radarA={radarA} radarB={radarB} rows={rows} qr={qr} />
      </div>
    </AppShell>
  );
}

function Head({
  entity,
  tone,
  align,
}: {
  entity: ReturnType<typeof findEntity>;
  tone: "primary" | "accent";
  align?: "end";
}) {
  const tier = tierStyles[entity.tier];
  return (
    <div className={cn("min-w-0", align === "end" && "text-end")}>
      <div className={cn("inline-block rounded-2xl bg-gradient-to-b p-[2px]", tier.frame)}>
        <div className="rounded-[14px] bg-surface px-3 py-1.5 text-2xl leading-none">
          {entity.nation}
        </div>
      </div>
      <h2 className={cn("truncate text-sm font-bold", tone === "primary" ? "text-primary" : "text-accent")}>
        {entity.name}
      </h2>
      <p className="truncate text-xs text-muted-foreground">{subtitleOf(entity)}</p>
    </div>
  );
}
