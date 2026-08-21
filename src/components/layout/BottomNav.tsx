import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { navItems } from "./nav-items";

export function BottomNav() {
  const { t } = useTranslation();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/95 backdrop-blur md:hidden">
      <ul className="grid grid-cols-7">
        {navItems.map(({ to, labelKey, icon: Icon }) => (
          <li key={to}>
            <Link
              to={to}
              activeOptions={{ exact: to === "/" }}
              activeProps={{ className: "text-primary" }}
              inactiveProps={{ className: "text-muted-foreground" }}
              className="flex flex-col items-center gap-1 px-1 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] transition-colors"
            >
              <Icon className="h-5 w-5 shrink-0" />
              <span className="w-full truncate text-center text-[10px] leading-tight">
                {t(labelKey)}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
