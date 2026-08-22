import { Star } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useFavorites, type FavoriteType } from "@/hooks/use-favorites";
import { rememberFavName } from "@/lib/settings";
import { cn } from "@/lib/utils";

export function FavoriteButton({
  type,
  id,
  name,
  className,
}: {
  type: FavoriteType;
  id: string;
  name?: string;
  className?: string;
}) {
  const { t } = useTranslation();
  const { isFavorite, toggle, ready } = useFavorites();
  const active = ready && isFavorite(type, id);

  return (
    <button
      type="button"
      onClick={() => {
        if (!active && name) rememberFavName(id, name);
        toggle(type, id);
      }}
      aria-pressed={active}
      aria-label={active ? t("favorites.remove") : t("favorites.add")}
      title={active ? t("favorites.remove") : t("favorites.add")}
      className={cn(
        "grid h-9 w-9 shrink-0 place-items-center rounded-xl border transition-colors",
        active
          ? "border-accent/50 bg-accent/15 text-accent"
          : "border-border bg-secondary/60 text-muted-foreground hover:bg-secondary hover:text-foreground",
        className,
      )}
    >
      <Star className={cn("h-4 w-4", active && "fill-current")} />
    </button>
  );
}
