import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { navItems } from "./nav-items";
import { cn } from "@/lib/utils";
import brandIcon from "@/assets/footcard-icon.png";

export function Sidebar() {
  const { t } = useTranslation();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        "sticky top-0 hidden h-screen shrink-0 flex-col border-e border-border bg-surface/70 p-3 transition-all md:flex",
        collapsed ? "w-[76px]" : "w-60",
      )}
    >
      <Link to="/" className="mb-6 flex items-center gap-2 px-2 py-1">
        <img
          src={brandIcon}
          alt="FootCard logo"
          width={36}
          height={36}
          className="h-9 w-9 shrink-0 rounded-xl"
        />
        {!collapsed && (
          <span className="truncate text-lg font-extrabold tracking-tight">
            Foot<span className="text-primary">Card</span>
          </span>
        )}
      </Link>

      <ul className="flex flex-1 flex-col gap-1">
        {navItems.map(({ to, labelKey, icon: Icon }) => (
          <li key={to}>
            <Link
              to={to}
              activeOptions={{ exact: to === "/" }}
              activeProps={{ className: "bg-secondary text-primary" }}
              inactiveProps={{ className: "text-muted-foreground hover:bg-secondary/60" }}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                collapsed && "justify-center px-0",
              )}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {!collapsed && <span className="truncate">{t(labelKey)}</span>}
            </Link>
          </li>
        ))}
      </ul>

      <button
        onClick={() => setCollapsed((c) => !c)}
        className="mt-2 flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary/60"
      >
        {collapsed ? (
          <PanelLeftOpen className="h-5 w-5" />
        ) : (
          <>
            <PanelLeftClose className="h-5 w-5" />
            <span>Collapse</span>
          </>
        )}
      </button>
    </aside>
  );
}
