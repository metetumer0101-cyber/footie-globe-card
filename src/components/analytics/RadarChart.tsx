import { useTranslation } from "react-i18next";
import type { CoreStats } from "@/data/football";

const ORDER: (keyof CoreStats)[] = ["pac", "sho", "pas", "dri", "def", "phy"];
const SIZE = 240;
const C = SIZE / 2;
const R = 88;

function point(i: number, radius: number) {
  const angle = (Math.PI / 3) * i - Math.PI / 2;
  return [C + radius * Math.cos(angle), C + radius * Math.sin(angle)] as const;
}

export function RadarChart({ core }: { core: CoreStats }) {
  const { t } = useTranslation();
  const rings = [0.25, 0.5, 0.75, 1];

  const polygon = (radiusFn: (i: number) => number) =>
    ORDER.map((_, i) => point(i, radiusFn(i)).join(",")).join(" ");

  return (
    <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="mx-auto h-56 w-56" role="img" aria-label={t("attributes")}>
      {rings.map((r) => (
        <polygon
          key={r}
          points={polygon(() => R * r)}
          fill="none"
          stroke="var(--color-border)"
          strokeWidth="1"
        />
      ))}
      {ORDER.map((_, i) => {
        const [x, y] = point(i, R);
        return <line key={i} x1={C} y1={C} x2={x} y2={y} stroke="var(--color-border)" strokeWidth="1" />;
      })}
      <polygon
        points={polygon((i) => (R * (core[ORDER[i]!] ?? 0)) / 100)}
        fill="var(--color-primary)"
        fillOpacity="0.28"
        stroke="var(--color-primary)"
        strokeWidth="2"
      />
      {ORDER.map((key, i) => {
        const [x, y] = point(i, (R * (core[key] ?? 0)) / 100);
        return <circle key={key} cx={x} cy={y} r="3" fill="var(--color-accent)" />;
      })}
      {ORDER.map((key, i) => {
        const [x, y] = point(i, R + 20);
        return (
          <text
            key={key}
            x={x}
            y={y}
            textAnchor="middle"
            dominantBaseline="middle"
            className="fill-muted-foreground text-[10px] font-bold"
          >
            {t(`attr.${key}`)} {core[key]}
          </text>
        );
      })}
    </svg>
  );
}
