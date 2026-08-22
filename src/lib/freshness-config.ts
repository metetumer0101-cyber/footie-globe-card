/**
 * Shared freshness tiers (seconds) for the API response cache.
 *
 * Shorter TTL = fresher data but more upstream calls; the stale-while-
 * revalidate behaviour in api-cache.server.ts keeps responses instant even
 * when an entry expires.
 */
export const TTL = {
  /** Live scores / in-play match details. */
  LIVE: 60,
  /** Daily fixture lists. */
  FIXTURES: 300,
  /** Standings / top scorers. */
  STANDINGS: 1_800,
  TOP_PLAYERS: 1_800,
  /** Player profiles, injuries and the current-club overlay. */
  PLAYER: 3_600,
  INJURIES: 3_600,
  /** Team squads. */
  SQUAD: 21_600,
  /** Transfer histories and team inbound transfers. */
  TRANSFERS: 21_600,
  /** World search result pages. */
  SEARCH: 21_600,
  /** Effectively static lookups (name → API id). */
  STATIC: 604_800,
} as const;
