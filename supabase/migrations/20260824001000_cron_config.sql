-- Step 3 (SportMonks migration): `cron_config` table holding shared scheduler
-- config read by the cron auth path — e.g. a `sync_token` that the serverless
-- cron route accepts via `Authorization: Bearer <token>`. Pairs with
-- `src/routes/api/public/cron/sync-players.ts`. Idempotent.

CREATE TABLE IF NOT EXISTS public.cron_config (
  key text PRIMARY KEY,
  value text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.cron_config TO service_role;

ALTER TABLE public.cron_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role only" ON public.cron_config;
CREATE POLICY "Service role only"
  ON public.cron_config
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
