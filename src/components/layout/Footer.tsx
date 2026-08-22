import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import brandIcon from "@/assets/footcard-icon.png";

export function Footer() {
  const { t } = useTranslation();
  return (
    <footer className="border-t border-border bg-surface/40 pb-28 md:pb-8">
      <div className="mx-auto grid max-w-5xl gap-6 px-4 py-8 sm:grid-cols-[1fr_auto_auto]">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <img src={brandIcon} alt="FootCard logo" width={28} height={28} className="h-7 w-7 rounded-lg" />
            <span className="font-extrabold tracking-tight">
              Foot<span className="text-primary">Card</span>
            </span>
          </div>
          <p className="max-w-xs text-xs text-muted-foreground">{t("footer.tagline")}</p>
        </div>
        <nav className="flex flex-col gap-2 text-sm">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {t("footer.product")}
          </span>
          <Link to="/scout" className="text-muted-foreground transition-colors hover:text-foreground">
            {t("nav.scout")}
          </Link>
          <Link to="/compare" className="text-muted-foreground transition-colors hover:text-foreground">
            {t("nav.compare")}
          </Link>
          <Link to="/live" className="text-muted-foreground transition-colors hover:text-foreground">
            {t("nav.live")}
          </Link>
          <Link to="/games" className="text-muted-foreground transition-colors hover:text-foreground">
            {t("nav.games")}
          </Link>
        </nav>
        <nav className="flex flex-col gap-2 text-sm">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {t("footer.company")}
          </span>
          <Link to="/about" className="text-muted-foreground transition-colors hover:text-foreground">
            {t("footer.about")}
          </Link>
          <Link to="/privacy" className="text-muted-foreground transition-colors hover:text-foreground">
            {t("footer.privacy")}
          </Link>
        </nav>
      </div>
      <div className="mx-auto max-w-5xl px-4 pb-4 text-xs text-muted-foreground/70">
        © {new Date().getFullYear()} FootCard · {t("footer.dataNote")}
      </div>
    </footer>
  );
}
