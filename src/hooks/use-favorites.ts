import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./use-auth";

const KEY = "footcard:favorites";

export type FavoriteType = "player" | "team";
export type Favorites = { players: string[]; teams: string[] };

const EMPTY: Favorites = { players: [], teams: [] };

function readLocal(): Favorites {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as Partial<Favorites>;
    return {
      players: Array.isArray(parsed.players)
        ? parsed.players.filter((x): x is string => typeof x === "string")
        : [],
      teams: Array.isArray(parsed.teams)
        ? parsed.teams.filter((x): x is string => typeof x === "string")
        : [],
    };
  } catch {
    return EMPTY;
  }
}

function writeLocal(f: Favorites) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(f));
  } catch {
    /* ignore */
  }
}

/**
 * Favorite players/teams. Guests persist to localStorage; signed-in users
 * persist to the favorites table, with a one-time merge of guest picks.
 */
export function useFavorites() {
  const { user, loading: authLoading } = useAuth();
  const [favorites, setFavorites] = useState<Favorites>(EMPTY);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    let cancelled = false;
    (async () => {
      if (!user) {
        if (!cancelled) {
          setFavorites(readLocal());
          setReady(true);
        }
        return;
      }
      const { data } = await supabase
        .from("favorites")
        .select("entity_type, entity_id")
        .eq("user_id", user.id);
      if (cancelled) return;
      const next: Favorites = { players: [], teams: [] };
      for (const row of data ?? []) {
        if (row.entity_type === "player") next.players.push(row.entity_id);
        else if (row.entity_type === "team") next.teams.push(row.entity_id);
      }
      // One-time merge: carry guest localStorage picks into the account.
      const local = readLocal();
      const missing = [
        ...local.players
          .filter((id) => !next.players.includes(id))
          .map((id) => ({ entity_type: "player" as const, entity_id: id })),
        ...local.teams
          .filter((id) => !next.teams.includes(id))
          .map((id) => ({ entity_type: "team" as const, entity_id: id })),
      ];
      if (missing.length) {
        await supabase.from("favorites").upsert(
          missing.map((m) => ({ ...m, user_id: user.id })),
          { onConflict: "user_id,entity_type,entity_id", ignoreDuplicates: true },
        );
        for (const m of missing) {
          if (m.entity_type === "player") next.players.push(m.entity_id);
          else next.teams.push(m.entity_id);
        }
        try {
          window.localStorage.removeItem(KEY);
        } catch {
          /* ignore */
        }
      }
      if (!cancelled) {
        setFavorites(next);
        setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, authLoading]);

  const toggle = useCallback(
    (type: FavoriteType, id: string) => {
      const list = type === "player" ? favorites.players : favorites.teams;
      const has = list.includes(id);
      const next: Favorites =
        type === "player"
          ? {
              ...favorites,
              players: has
                ? favorites.players.filter((x) => x !== id)
                : [...favorites.players, id],
            }
          : {
              ...favorites,
              teams: has
                ? favorites.teams.filter((x) => x !== id)
                : [...favorites.teams, id],
            };
      setFavorites(next);
      if (user) {
        if (has) {
          void supabase
            .from("favorites")
            .delete()
            .eq("user_id", user.id)
            .eq("entity_type", type)
            .eq("entity_id", id);
        } else {
          void supabase
            .from("favorites")
            .upsert(
              { user_id: user.id, entity_type: type, entity_id: id },
              { onConflict: "user_id,entity_type,entity_id", ignoreDuplicates: true },
            );
        }
      } else {
        writeLocal(next);
      }
    },
    [favorites, user],
  );

  const isFavorite = useCallback(
    (type: FavoriteType, id: string) =>
      (type === "player" ? favorites.players : favorites.teams).includes(id),
    [favorites],
  );

  return { favorites, toggle, isFavorite, ready };
}
