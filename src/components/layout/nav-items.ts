import { Home, Search, Swords, Users, Gamepad2, Radio, User } from "lucide-react";

export const navItems = [
  { to: "/", labelKey: "nav.home", icon: Home },
  { to: "/live", labelKey: "nav.live", icon: Radio },
  { to: "/scout", labelKey: "nav.scout", icon: Search },
  { to: "/compare", labelKey: "nav.compare", icon: Swords },
  { to: "/squad", labelKey: "nav.squad", icon: Users },
  { to: "/games", labelKey: "nav.games", icon: Gamepad2 },
  { to: "/profile", labelKey: "nav.profile", icon: User },
] as const;
