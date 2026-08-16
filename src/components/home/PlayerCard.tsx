import type { Player } from "./data";

export function PlayerCard({ player }: { player: Player }) {
  return (
    <article className="card-surface w-36 shrink-0 snap-start rounded-2xl p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="rounded-lg bg-accent/15 px-1.5 py-0.5 text-xs font-bold text-accent">
          {player.rating}
        </span>
        <span className="text-xs text-muted-foreground">{player.position}</span>
      </div>
      <div className="mb-2 grid h-20 w-full place-items-center rounded-xl bg-secondary/50 text-3xl">
        {player.country}
      </div>
      <h3 className="truncate text-sm font-semibold">{player.name}</h3>
      <p className="truncate text-xs text-muted-foreground">{player.club}</p>
    </article>
  );
}
