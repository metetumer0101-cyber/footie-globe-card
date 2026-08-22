const KEY = "footcard:settings";
const NAMES_KEY = "footcard:fav-names";

export type UserSettings = { league?: string };

export function readSettings(): UserSettings {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Partial<UserSettings>;
    return { league: typeof parsed.league === "string" ? parsed.league : undefined };
  } catch {
    return {};
  }
}

export function writeSettings(next: UserSettings) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
}

/** Display names recorded when a favorite is added, for feed matching. */
export function readFavNames(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(NAMES_KEY);
    const parsed = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(parsed)) {
      if (typeof v === "string") out[k] = v;
    }
    return out;
  } catch {
    return {};
  }
}

export function rememberFavName(id: string, name: string) {
  if (typeof window === "undefined" || !name) return;
  try {
    const names = readFavNames();
    names[id] = name;
    window.localStorage.setItem(NAMES_KEY, JSON.stringify(names));
  } catch {
    /* ignore */
  }
}
