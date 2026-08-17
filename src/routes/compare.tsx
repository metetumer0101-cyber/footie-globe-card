import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { AppShell } from "@/components/layout/AppShell";
import { players, type CoreStats, type PlayerCardData } from "@/data/football";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/compare")({
  head: () => ({
    meta: [
      { title: "Compare — FootCard" },
      { name: "description", content: "Compare football players attribute by attribute, head to head." },
      { property: "og:title", content: "Compare — FootCard" },
      { property: "og:description", content: "Compare football players attribute by attribute, head to head." },
    ],
  }),
  component: Page,
});

function Page() {
  const { t } = useTranslation();
  const [leftId, setLeftId] = useState(players[0]!.id);
  const [rightId, setRightId] = useState(players[1]!.id);

  const left = players.find((p) => p.id === leftId)!;
  const right = players.find((p) => p.id === rightId)!;
  const keys: (keyof CoreStats)[] = ["pac", "sho", "pas", "dri", "def", "phy"];

  return (
    <AppShell>
      <section className="space-y-4">
        <h1 className="text-2xl font-bold">{t("headToHead")}</h1>
        <p className="text-sm text-muted-foreground">{t("compareHint")}</p>

        <div className="grid grid-cols-2 gap-2">
          <PlayerPicker value={leftId} onChange={setLeftId} label={t("selectPlayer")} />
          <PlayerPicker value={rightId} onChange={setRightId} label={t("selectPlayer")} />
        </div>

        <div className="card-surface grid grid-cols-2 gap-2 rounded-2xl p-3">
          <PlayerHead player={left} />
          <PlayerHead player={right} align="end" />
        </div>

        <ul className="card-surface space-y-2.5 rounded-2xl p-3">
          {keys.map((k) => {
            const a = left.core[k];
            const b = right.core[k];
            return (
              <li key={k}>
                <div className="mb-1 flex items-center justify-between text-xs font-bold">
                  <span className={cn(a >= b ? "text-primary" : "text-muted-foreground")}>{a}</span>
                  <span className="text-[10px] uppercase tracking-wide text-accent">
                    {t(`attr.${k}`)}
                  </span>
                  <span className={cn(b >= a ? "text-primary" : "text-muted-foreground")}>{b}</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="flex h-1.5 flex-1 justify-end overflow-hidden rounded-full bg-secondary/50">
                    <span
                      className={cn("h-full rounded-full", a >= b ? "bg-primary" : "bg-muted-foreground")}
                      style={{ width: `${a}%` }}
                    />
                  </div>
                  <div className="flex h-1.5 flex-1 overflow-hidden rounded-full bg-secondary/50">
                    <span
                      className={cn("h-full rounded-full", b >= a ? "bg-primary" : "bg-muted-foreground")}
                      style={{ width: `${b}%` }}
                    />
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    </AppShell>
  );
}

function PlayerPicker({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  label: string;
}) {
  return (
    <select
      aria-label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="card-surface w-full truncate rounded-2xl px-3 py-2 text-sm font-semibold outline-none"
    >
      {players.map((p) => (
        <option key={p.id} value={p.id} className="bg-surface">
          {p.name}
        </option>
      ))}
    </select>
  );
}

function PlayerHead({ player, align }: { player: PlayerCardData; align?: "end" }) {
  return (
    <div className={cn("min-w-0", align === "end" && "text-end")}>
      <span className="text-2xl">{player.nation}</span>
      <h2 className="truncate text-sm font-bold">{player.name}</h2>
      <p className="truncate text-xs text-muted-foreground">
        {player.clubBadge} {player.club} · {player.position}
      </p>
    </div>
  );
}
