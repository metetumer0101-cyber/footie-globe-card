/**
 * One-off world_players sync driver (SportMonks mirror).
 *
 * Usage: SPORTMONKS_API_TOKEN=... SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
 *        bun run scripts/run-sync.ts <comma-separated API-Football league ids>
 *
 * Calls the same `syncLeaguePlayers` the cron route / admin panel use, so the
 * code path exercised here is identical to production. No secrets in repo.
 */
import { syncLeaguePlayers } from "@/lib/player-db.server";

const arg = (process.argv[2] ?? "39").split(",").map((s) => parseInt(s.trim(), 10)).filter(Number.isFinite);

async function main() {
  if (!process.env["SPORTMONKS_API_TOKEN"]) {
    console.error("SPORTMONKS_API_TOKEN is not set");
    process.exit(1);
  }
  if (!process.env["SUPABASE_URL"] || !process.env["SUPABASE_SERVICE_ROLE_KEY"]) {
    console.error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set");
    process.exit(1);
  }
  console.log(`Running sync for league ids: ${arg.join(", ")}`);
  for (const leagueId of arg) {
    const started = Date.now();
    try {
      const result = await syncLeaguePlayers(leagueId, process.env["SPORTMONKS_API_TOKEN"]);
      console.log(
        `[${leagueId}] -> ${JSON.stringify(result)} (${((Date.now() - started) / 1000).toFixed(1)}s)`,
      );
    } catch (err) {
      console.error(`[${leagueId}] FAILED:`, err);
    }
  }
}

main();
