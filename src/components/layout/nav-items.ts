import { Home, Search, Swords, Users, Trophy, User } from "lucide-react";

export const navItems = [
  { to: "/", labelKey: "nav.home", icon: Home },
  { to: "/scout", labelKey: "nav.scout", icon: Search },
  { to: "/compare", labelKey: "nav.compare", icon: Swords },
  { to: "/squad", labelKey: "nav.squad", icon: Users },
  { to: "/competitions", labelKey: "nav.competitions", icon: Trophy },
  { to: "/profile", labelKey: "nav.profile", icon: User },
] as const;
