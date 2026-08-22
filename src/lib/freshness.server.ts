/**
 * Server-only helpers for the freshness layer.
 *
 * The transfers endpoint is the freshest signal API-Football exposes: squad
 * lists and season statistics lag behind by hours to days after a move,
 * while the latest inbound transfer already names the new club. Imported
 * exclusively by src/lib/freshness.functions.ts (the thin wrapper).
 */

const API_BASE = "https://v3.football.api-sports.io";

async function apiFootball<T>(path: string, apiKey: string): Promise<T | null> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "x-apisports-key": apiKey },
  });
  if (!res.ok) {
    console.error(`[freshness] API-Football ${path} -> ${res.status}`);
    return null;
  }
  return (await res.json()) as T;
}

export type CurrentClub = {
  apiPlayerId: number;
  club: string;
  teamId?: number | undefined;
  logo?: string | undefined;
  since?: string | undefined;
  from?: string | undefined;
};

type TransfersResponse = {
  response?: {
    player?: { id?: number; name?: string };
    transfers?: {
      date?: string;
      type?: string;
      teams?: {
        in?: { id?: number; name?: string; logo?: string };
        out?: { id?: number; name?: string; logo?: string };
      };
    }[];
  }[];
};

/** Latest known club of a player, derived from their most recent transfer. */
export async function fetchCurrentClub(
  apiPlayerId: number,
  apiKey: string,
): Promise<CurrentClub | null> {
  const json = await apiFootball<TransfersResponse>(`/transfers?player=${apiPlayerId}`, apiKey);
  const moves = (json?.response?.[0]?.transfers ?? [])
    .filter((m) => Boolean(m.teams?.in?.name))
    .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
  const last = moves[0];
  if (!last?.teams?.in?.name) return null;
  return {
    apiPlayerId,
    club: last.teams.in.name,
    teamId: last.teams.in.id,
    logo: last.teams.in.logo,
    since: last.date,
    from: last.teams.out?.name,
  };
}

const stripDiacritics = (value: string) =>
  value.normalize("NFD").replace(/[̀-ͯ]/g, "");

const NAME_SUFFIXES = new Set(["jr", "jr.", "sr", "sr.", "ii", "iii", "iv"]);

/**
 * Resolve a display name (e.g. from the local catalogue) to an API-Football
 * player id. Matching is deliberately strict: a wrong id shows the wrong
 * club, which is worse than no overlay — so uncertain names return null.
 */
export async function resolvePlayerIdByName(
  name: string,
  apiKey: string,
): Promise<number | null> {
  const cleaned = stripDiacritics(name.trim());
  const parts = cleaned.split(/\s+/).filter(Boolean);
  let query = parts[parts.length - 1] ?? cleaned;
  if (NAME_SUFFIXES.has(query.toLowerCase()) && parts.length > 1) {
    query = parts[parts.length - 2]!;
  }
  if (query.length < 3) return null;

  const json = await apiFootball<{
    response?: {
      player?: { id?: number; name?: string; firstname?: string; lastname?: string };
    }[];
  }>(`/players/profiles?search=${encodeURIComponent(query)}`, apiKey);

  const rows = (json?.response ?? [])
    .map((r) => r.player)
    .filter((p): p is NonNullable<typeof p> => Boolean(p?.id && p?.name));
  if (!rows.length) return null;

  const norm = (value?: string) => stripDiacritics(value ?? "").toLowerCase();
  const target = cleaned.toLowerCase();
  const queryLower = query.toLowerCase();
  const firstToken = norm(parts[0]);

  const best = rows
    .map((p) => {
      const full = norm(p.name);
      const last = norm(p.lastname);
      const first = norm(p.firstname);
      let score = 0;
      if (full === target) score = 4;
      else if (last === queryLower && first && firstToken && first.startsWith(firstToken)) score = 3;
      else if (full.includes(target) || target.includes(full)) score = 2;
      else if (last === queryLower) score = 1;
      return { p, score };
    })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)[0];

  return best ? (best.p.id as number) : null;
}

export type TeamInboundTransfer = {
  playerId: number;
  playerName: string;
  date: string;
  fromTeam?: string | undefined;
};

/** Players who joined the team within the last `withinDays` days. */
export async function fetchRecentInboundTransfers(
  teamId: number,
  apiKey: string,
  withinDays = 45,
): Promise<TeamInboundTransfer[]> {
  const json = await apiFootball<TransfersResponse>(`/transfers?team=${teamId}`, apiKey);
  const cutoff = Date.now() - withinDays * 86_400_000;
  const out: TeamInboundTransfer[] = [];
  for (const row of json?.response ?? []) {
    const playerId = row.player?.id;
    const playerName = row.player?.name;
    if (!playerId || !playerName) continue;
    const latestInbound = (row.transfers ?? [])
      .filter(
        (tr) =>
          tr.teams?.in?.id === teamId && tr.date && new Date(tr.date).getTime() >= cutoff,
      )
      .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""))[0];
    if (latestInbound?.date) {
      out.push({
        playerId,
        playerName,
        date: latestInbound.date,
        fromTeam: latestInbound.teams?.out?.name,
      });
    }
  }
  return out.sort((a, b) => b.date.localeCompare(a.date));
}
