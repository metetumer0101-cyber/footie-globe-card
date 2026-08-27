/**
 * Central player display-name resolver.
 *
 * Single source of truth for how a player's name is rendered across Squad
 * Builder and search surfaces. Priority (product rule, owner-ratified in the
 * Squad Builder #1 brief):
 *   1. `display_name` — SportMonks' full display name ("Lionel Messi")
 *   2. `common_name`  — SportMonks' short/common name ("L. Messi", "Arda Güler")
 *   3. `name`         — first + last WORD of the full official name, dropping
 *                       middle/secondary names
 *                       ("Lionel Andrés Messi Cuccittini" → "Lionel Messi")
 *   4. `firstname` + `lastname` — joined
 *   5. `"Unknown Player"`
 *
 * Null/undefined-safe: never throws, always returns a non-empty string. The
 * goal is that official long middle/secondary surnames (e.g. "Cuccittini",
 * "Dos Santos") never appear anywhere in the UI.
 */

export type PlayerNameLike = {
  display_name?: string | null | undefined;
  common_name?: string | null | undefined;
  name?: string | null | undefined;
  firstname?: string | null | undefined;
  lastname?: string | null | undefined;
};

export const UNKNOWN_PLAYER_NAME = "Unknown Player";

const trim = (s?: string | null): string => (s == null ? "" : s.trim());

/** Lowercase surname particles (van, de, dos, …) that begin/join a compound
 * surname and must be kept together ("De Bruyne", "van der Sar", "dos Santos"). */
const SURNAME_PARTICLES = new Set([
  "de", "del", "dos", "das", "da", "di", "el", "la", "le", "les", "du", "des",
  "van", "von", "der", "den", "ter", "ten", "y", "e", "o", "vom", "zum", "a",
]);

/**
 * Short, readable name from a long official full name.
 *
 * Product rule (owner's concrete example): keep only the first given name and
 * the main (paternal) surname, dropping every middle/second given name AND any
 * trailing maternal/secondary surname:
 *   "Lionel Andrés Messi Cuccittini" → "Lionel Messi"   (Cuccittini dropped)
 *   "Kevin De Bruyne"                → "Kevin De Bruyne" (particle surname kept)
 *   "Edwin van der Sar"              → "Edwin van der Sar"
 *   "Endrick"                        → "Endrick"
 *
 * When a name has 3+ words and no particle surname, the final (maternal/secondary)
 * word is dropped and the second-to-last word is used as the main surname. A
 * 1–2 word name is returned as-is. This keeps both long official names short and
 * already-compact display names intact.
 */
export function firstAndMainSurname(fullName: string): string {
  const words = fullName.split(/\s+/).filter(Boolean);
  if (words.length <= 1) return words[0] ?? fullName;
  if (words.length === 2) return `${words[0]} ${words[1]}`;

  // Find the last non-particle word (the core surname).
  let end = words.length - 1;
  while (end > 0 && SURNAME_PARTICLES.has(words[end]!.toLowerCase())) end -= 1;

  // A particle immediately before it starts/joins the surname → keep the whole
  // particle surname (e.g. "De Bruyne", "van der Sar", "dos Santos").
  if (end > 0 && SURNAME_PARTICLES.has(words[end - 1]!.toLowerCase())) {
    let start = end - 1;
    while (start > 0 && SURNAME_PARTICLES.has(words[start - 1]!.toLowerCase())) start -= 1;
    return `${words[0]} ${words.slice(start).join(" ")}`;
  }

  // No particle surname: first given name + the main (second-to-last) surname,
  // dropping the trailing maternal/secondary word per the owner's example.
  if (end >= 2) return `${words[0]} ${words[end - 1]}`;
  return `${words[0]} ${words[end]}`;
}

/**
 * Best short, readable display name for a player object, per the priority list
 * above. Accepts any object carrying the SportMonks name fields — including the
 * app's own provider-agnostic shapes (`PlayerCardData`, `WorldPlayer`,
 * `ManagerCardData`) that only carry `name`.
 */
export function getPlayerDisplayName(player: PlayerNameLike | null | undefined): string {
  if (!player) return UNKNOWN_PLAYER_NAME;
  const display = trim(player.display_name);
  if (display) return display;
  const common = trim(player.common_name);
  if (common) return common;
  const full = trim(player.name);
  if (full) return firstAndMainSurname(full);
  const firstLast = trim(`${trim(player.firstname)} ${trim(player.lastname)}`);
  return firstLast || UNKNOWN_PLAYER_NAME;
}