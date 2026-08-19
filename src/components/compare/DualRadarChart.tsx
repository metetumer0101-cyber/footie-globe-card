import { useTranslation } from "react-i18next";
import type { RadarPoint } from "@/lib/compare";

const SIZE = 260;
const C = SIZE / 2;
const R = 88;

function point(i: number, radius: number) {
  const angle = (Math.PI / 3) * i - Math.PI / 2;
  return [C + radius * Math.cos(angle), C + radius * Math.sin(angle)] as const;
}

export function DualRadarChart({
  a,
  b,
  className,
}: {
  a: RadarPoint[];
  b: RadarPoint[];
  className?: string;
}) {
  const { t } = useTranslation();
  const rings = [0.25, 0.5, 0.75, 1];
  const poly = (data: RadarPoint[]) =>
    data.map((p, i) => point(i, (R * p.value) / 100).join(",")).join(" ");
  const grid = (r: number) =>
    a.map((_, i) => point(i, R * r).join(",")).join(" ");

  return (
    <svg
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      className={className ?? "mx-auto h-64 w-64"}
      role="img"
      aria-label={t("cmp.radarTitle")}
    >
      {rings.map((r) => (
        <polygon key={r} points={grid(r)} fill="none" stroke="var(--color-border)" strokeWidth="1" />
      ))}
      {a.map((_, i) => {
        const [x, y] = point(i, R);
        return <line key={i} x1={C} y1={C} x2={x} y2={y} stroke="var(--color-border)" strokeWidth="1" />;
      })}
      <polygon
        points={poly(a)}
        fill="var(--color-primary)"
        fillOpacity="0.25"
        stroke="var(--color-primary)"
        strokeWidth="2"
      />
      <polygon
        points={poly(b)}
        fill="var(--color-accent)"
        fillOpacity="0.22"
        stroke="var(--color-accent)"
        strokeWidth="2"
      />
      {a.map((p, i) => {
        const [x, y] = point(i, R + 22);
        return (
          <text
            key={p.key}
            x={x}
            y={y}
            textAnchor="middle"
            dominantBaseline="middle"
            className="fill-muted-foreground text-[10px] font-bold"
          >
            {t(`attr.${p.key}`)}
          </text>
        );
      })}
    </svg>
  );
}
