import { Link, useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { ChevronRight, Sparkles } from "lucide-react";
import { useFavorites } from "@/hooks/use-favorites";
import { useLiveFeed } from "@/hooks/use-live-feed";
import { readFavNames } from "@/lib/settings";
import { players, teams } from "@/data/football";
import { PlayerFrontCard } from "@/components/cards/PlayerFrontCard";

/** Personalized home row: favorite teams' matches today + followed players. */
export function ForYouSection() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { favorites, ready } = useFavorites();
  const { data } = useLiveFeed();

  if (!ready) return null;

  const names = readFavNames();
  const favTeamNames = favorites.teams
    .map((id) => teams.find((tm) => tm.id === id)?.name ?? names[id])
    .filter((n): n is string => Boolean(n))
    .map((n) => n.toLowerCase());

  const teamFixtures = (data?.fixtures ?? [])
    .filter(
      (f) =>
        favTeamNames.includes(f.home.name.toLowerCase()) ||
        favTeamNames.includes(f.away.name.toLowerCase()),
    )
    .slice(0, 4);

  const localPlayers = players.filter((p) => favorites.players.includes(p.id));
  const apiPlayers = favorites.players
    .filter((id) => id.startsWith("api-"))
    .map((id) => ({ id, name: names[id] }))
    .filter((p): p is { id: string; name: string } => Boolean(p.name));

  if (!teamFixtures.length && !localPlayers.length && !apiPlayers.length) return null;

  return (
    <section className="card-surface mt-4 rounded-3xl p-4">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-muted-foreground">
        <Sparkles className="h-4 w-4 text-accent" />
        {t("forYou.title")}
      </h2>

      {teamFixtures.length > 0 && (
        <div className="mb-3">
          <h3 className="mb-1.5 text-xs font-semibold text-muted-foreground">
            {t("forYou.teamMatches")}
          </h3>
          <ul className="space-y-1.5">
            {teamFixtures.map((f) => (
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
                      f.status === "live"
                        ? "bg-primary/20 text-primary"
                        : "bg-secondary text-muted-foreground"
                    }`}
                  >
                    {f.status === "live" ? `${f.minute}'` : f.status === "finished" ? "FT" : f.kickoff}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {(localPlayers.length > 0 || apiPlayers.length > 0) && (
        <div>
          <h3 className="mb-1.5 text-xs font-semibold text-muted-foreground">
            {t("forYou.players")}
          </h3>
          <div className="no-scrollbar -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-1">
            {localPlayers.map((p) => (
              <PlayerFrontCard
                key={p.id}
                player={p}
                onClick={() => void navigate({ to: "/player/$id", params: { id: p.id } })}
              />
            ))}
            {apiPlayers.map((p) => (
              <Link
                key={p.id}
                to="/player/$id"
                params={{ id: p.id }}
                className="card-surface flex w-40 shrink-0 snap-start items-center gap-2 rounded-2xl p-3 transition-colors hover:bg-secondary/40"
              >
                <span className="min-w-0 flex-1 truncate text-sm font-semibold">{p.name}</span>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </Link>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
