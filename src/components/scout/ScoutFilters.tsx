import { useTranslation } from "react-i18next";
import { RotateCcw } from "lucide-react";
import {
  AGE_BOUNDS,
  VALUE_BOUNDS,
  defaultFilters,
  emptyStats,
  leagues,
  nations,
  positionsList,
  type ScoutFilterState,
  type StatKey,
} from "@/lib/scout";
import { cn } from "@/lib/utils";

const statKeys: StatKey[] = ["pac", "sho", "pas", "dri", "def", "phy"];
const feet = ["all", "right", "left", "both"] as const;
const contractYears = [2026, 2027, 2028, 2029] as const;

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      {children}
    </div>
  );
}

const selectCls =
  "w-full rounded-xl bg-secondary/50 px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary";

export function ScoutFilters({
  value,
  onChange,
}: {
  value: ScoutFilterState;
  onChange: (f: ScoutFilterState) => void;
}) {
  const { t } = useTranslation();
  const set = (patch: Partial<ScoutFilterState>) => onChange({ ...value, ...patch });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-bold">{t("filters")}</span>
        <button
          onClick={() => onChange({ ...defaultFilters, minStats: { ...emptyStats } })}
          className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          {t("scout.reset")}
        </button>
      </div>

      <Row label={t("position")}>
        <div className="flex flex-wrap gap-1.5">
          {positionsList.map((p) => {
            const on = value.positions.includes(p);
            return (
              <button
                key={p}
                onClick={() =>
                  set({
                    positions: on
                      ? value.positions.filter((x) => x !== p)
                      : [...value.positions, p],
                  })
                }
                className={cn(
                  "rounded-full px-2.5 py-1 text-xs font-semibold transition-colors",
                  on
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary/50 text-muted-foreground hover:text-foreground",
                )}
              >
                {p}
              </button>
            );
          })}
        </div>
      </Row>

      <Row label={`${t("scout.ageRange")}: ${value.age[0]} – ${value.age[1]}`}>
        <div className="flex items-center gap-2">
          <input
            type="range"
            min={AGE_BOUNDS[0]}
            max={AGE_BOUNDS[1]}
            value={value.age[0]}
            onChange={(e) =>
              set({ age: [Math.min(+e.target.value, value.age[1]), value.age[1]] })
            }
            className="w-full accent-primary"
          />
          <input
            type="range"
            min={AGE_BOUNDS[0]}
            max={AGE_BOUNDS[1]}
            value={value.age[1]}
            onChange={(e) =>
              set({ age: [value.age[0], Math.max(+e.target.value, value.age[0])] })
            }
            className="w-full accent-primary"
          />
        </div>
      </Row>

      <Row label={`${t("scout.valueRange")}: €${value.value[0]}M – €${value.value[1]}M`}>
        <div className="flex items-center gap-2">
          <input
            type="range"
            min={VALUE_BOUNDS[0]}
            max={VALUE_BOUNDS[1]}
            step={5}
            value={value.value[0]}
            onChange={(e) =>
              set({ value: [Math.min(+e.target.value, value.value[1]), value.value[1]] })
            }
            className="w-full accent-accent"
          />
          <input
            type="range"
            min={VALUE_BOUNDS[0]}
            max={VALUE_BOUNDS[1]}
            step={5}
            value={value.value[1]}
            onChange={(e) =>
              set({ value: [value.value[0], Math.max(+e.target.value, value.value[0])] })
            }
            className="w-full accent-accent"
          />
        </div>
      </Row>

      <Row label={t("preferredFoot")}>
        <div className="flex flex-wrap gap-1.5">
          {feet.map((f) => (
            <button
              key={f}
              onClick={() => set({ foot: f })}
              className={cn(
                "rounded-full px-2.5 py-1 text-xs font-semibold transition-colors",
                value.foot === f
                  ? "bg-accent text-accent-foreground"
                  : "bg-secondary/50 text-muted-foreground hover:text-foreground",
              )}
            >
              {f === "all" ? t("scout.any") : t(f)}
            </button>
          ))}
        </div>
      </Row>

      <Row label={t("scout.contractBefore")}>
        <select
          value={String(value.contractBefore)}
          onChange={(e) =>
            set({ contractBefore: e.target.value === "all" ? "all" : Number(e.target.value) })
          }
          className={selectCls}
        >
          <option value="all">{t("scout.any")}</option>
          {contractYears.map((y) => (
            <option key={y} value={y}>
              ≤ {y}
            </option>
          ))}
        </select>
      </Row>

      <Row label={t("scout.minStats")}>
        <div className="space-y-2">
          {statKeys.map((k) => (
            <div key={k} className="flex items-center gap-2">
              <span className="w-9 text-[11px] font-bold uppercase text-muted-foreground">
                {t(`attr.${k}`)}
              </span>
              <input
                type="range"
                min={0}
                max={99}
                value={value.minStats[k]}
                onChange={(e) =>
                  set({ minStats: { ...value.minStats, [k]: +e.target.value } })
                }
                className="w-full accent-primary"
              />
              <span className="w-7 text-end text-xs font-bold">{value.minStats[k]}</span>
            </div>
          ))}
        </div>
      </Row>

      <Row label={t("scout.league")}>
        <select
          value={value.league}
          onChange={(e) => set({ league: e.target.value })}
          className={selectCls}
        >
          <option value="all">{t("scout.any")}</option>
          {leagues.map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </select>
      </Row>

      <Row label={t("scout.nation")}>
        <select
          value={value.nation}
          onChange={(e) => set({ nation: e.target.value })}
          className={selectCls}
        >
          <option value="all">{t("scout.any")}</option>
          {nations.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </Row>
    </div>
  );
}
