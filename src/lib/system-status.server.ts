/**
 * Server-only tracking of the external football API quota state.
 *
 * API-Football free keys have a daily request quota. When it is exhausted the
 * provider returns an error body / `X-RateLimit-Remaining: 0` and every
 * upstream call is silently useless. We record that state (in-process) so the
 * UI can render an honest, elegant "quota reached / system updating" empty
 * state instead of a broken-looking blank feed — and never a fabricated
 * mock fallback.
 *
 * NOTE: this is in-process state. On the long-running live server it reflects
 * the real last API call. On ephemeral serverless workers each cold instance
 * starts as "ok" and re-learns the quota on its first API call; that is
 * acceptable here because the empty-data state the UI shows is ultimately
 * driven by the feed/cache producing no data, with this flag only refining
 * the message the user sees.
 */

export type SystemStatus = {
  status: "ok" | "quota" | "updating";
  /** ISO-string timestamp of when the quota was last detected as exhausted. */
  quotaExhaustedAt: string | null;
  /** ISO-string timestamp of the last successful upstream fetch. */
  lastUpstreamAt: string | null;
};

let quotaExhaustedAt: number | null = null;
let lastUpstreamAt: number | null = null;

/** A successful upstream fetch: quota is available again. */
export function reportUpstreamOk(now = Date.now()): void {
  lastUpstreamAt = now;
  quotaExhaustedAt = null;
}

/** The provider told us the request/day quota is exhausted. */
export function reportQuotaExhausted(now = Date.now()): void {
  quotaExhaustedAt = now;
}

export function getSystemStatus(): SystemStatus {
  return {
    status: quotaExhaustedAt ? "quota" : "ok",
    quotaExhaustedAt: quotaExhaustedAt ? new Date(quotaExhaustedAt).toISOString() : null,
    lastUpstreamAt: lastUpstreamAt ? new Date(lastUpstreamAt).toISOString() : null,
  };
}
