import { useTranslation } from "react-i18next";
import { rankFor, type Rank } from "@/lib/ranks";

export function RankBadge({ xp, rank, size = "sm" }: { xp?: number; rank?: Rank; size?: "sm" | "lg" }) {
  const { t } = useTranslation();
  const r = rank ?? rankFor(xp ?? 0);
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-semibold ${r.badge} ${
        size === "lg" ? "px-3 py-1.5 text-sm" : "px-2.5 py-1 text-xs"
      }`}
    >
      <span aria-hidden>{r.emoji}</span>
      {t(`games.rank.${r.key}`)}
    </span>
  );
}
