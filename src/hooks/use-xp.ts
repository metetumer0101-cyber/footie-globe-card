import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { GameKey } from "@/lib/games";
import { useAuth } from "./use-auth";

const GUEST_KEY = "footcard:guest-xp";

export type LeaderboardRow = { id: string; display_name: string; xp: number };

export function useXp() {
  const { user, loading: authLoading } = useAuth();
  const [xp, setXp] = useState(0);
  const [displayName, setDisplayName] = useState("Scout");
  const [ready, setReady] = useState(false);

  const loadGuest = useCallback(() => {
    if (typeof window === "undefined") return 0;
    return Number(window.localStorage.getItem(GUEST_KEY) ?? 0);
  }, []);

  useEffect(() => {
    if (authLoading) return;
    let cancelled = false;
    (async () => {
      if (!user) {
        setXp(loadGuest());
        setDisplayName("Guest");
        setReady(true);
        return;
      }
      const { data } = await supabase
        .from("profiles")
        .select("display_name, total_xp")
        .eq("id", user.id)
        .maybeSingle();
      if (cancelled) return;
      if (!data) {
        const fallback = user.email?.split("@")[0] ?? "Scout";
        await supabase.from("profiles").insert({ id: user.id, display_name: fallback });
        setDisplayName(fallback);
        setXp(0);
      } else {
        setDisplayName(data.display_name);
        setXp(data.total_xp);
      }
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [user, authLoading, loadGuest]);

  const award = useCallback(
    async (game: GameKey, amount: number) => {
      if (!user) {
        const next = Math.max(0, loadGuest() + amount);
        window.localStorage.setItem(GUEST_KEY, String(next));
        setXp(next);
        return next;
      }
      const { data, error } = await supabase.rpc("award_xp", { _game: game, _xp: amount });
      if (error) {
        setXp((v) => Math.max(0, v + amount));
        return null;
      }
      setXp(data as number);
      return data as number;
    },
    [user, loadGuest],
  );

  const rename = useCallback(
    async (name: string) => {
      setDisplayName(name);
      if (user) await supabase.from("profiles").update({ display_name: name }).eq("id", user.id);
    },
    [user],
  );

  return { xp, displayName, award, rename, ready, isGuest: !user, user };
}

export async function fetchGlobalLeaderboard(): Promise<LeaderboardRow[]> {
  const { data } = await supabase
    .from("profiles")
    .select("id, display_name, total_xp")
    .order("total_xp", { ascending: false })
    .limit(100);
  return (data ?? []).map((r) => ({ id: r.id, display_name: r.display_name, xp: r.total_xp }));
}

export async function fetchWeeklyLeaderboard(): Promise<LeaderboardRow[]> {
  const { data } = await supabase.rpc("weekly_leaderboard");
  return ((data ?? []) as { id: string; display_name: string; xp: number }[]).map((r) => ({
    id: r.id,
    display_name: r.display_name,
    xp: Number(r.xp),
  }));
}
