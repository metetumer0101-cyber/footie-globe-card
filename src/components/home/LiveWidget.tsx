import { useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { ChevronRight, Radio } from "lucide-react";
import { buildMockFeed } from "@/lib/live";
import { useLiveFeed } from "@/hooks/use-live-feed";
import { FixtureRowSkeleton } from "@/components/ui/card-skeleton";

/** Compact home-page snapshot of today's fixtures; full center lives at /live. */
export function LiveWidget() {
  const { t } = useTranslation();
  const { data, isLoading } = useLiveFeed();
  const fallback = useMemo(() => buildMockFeed(), []);
  const fixtures = (data?.fixtures ?? (isLoading ? [] : fallback.fixtures)).slice(0, 3);
  if (!fixtures.length && !isLoading) return null;

  return (
    <section className="card-surface mt-4 rounded-3xl p-4">
      <header className="mb-2 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-muted-foreground">
          <Radio className="h-4 w-4 text-primary" />
          {t("liveCenter.title", { defaultValue: "Live Matches" })}
        </h2>
        <Link to="/live" className="flex items-center gap-0.5 text-xs font-semibold text-primary">
          {t("viewAll", { defaultValue: "View all" })}
          <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </header>
      <ul className="space-y-1.5">
        {fixtures.map((f) => (
          <li key={f.id}>
            <Link
              to="/live/$fixtureId"
              params={{ fixtureId: f.id }}
              className="flex items-center justify-between rounded-xl bg-secondary/40 px-3 py-2 text-xs transition-colors hover:bg-secondary/70"
            >
              <span className="min-w-0 flex-1 truncate">{f.home.name}</span>
              <span className="mx-2 shrink-0 font-extrabold tabular-nums">
                {f.home.score}-{f.away.score}
              </span>
              <span className="min-w-0 flex-1 truncate text-right">{f.away.name}</span>
              <span
                className={`ml-2 shrink-0 rounded-full px-2 py-0.5 font-bold ${
                  f.status === "live" ? "bg-primary/20 text-primary" : "bg-secondary text-muted-foreground"
                }`}
              >
                {f.status === "live" ? `${f.minute}'` : f.status === "finished" ? "FT" : f.kickoff}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
