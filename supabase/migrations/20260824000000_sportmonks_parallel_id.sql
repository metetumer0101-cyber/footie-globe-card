-- Step 3 (SportMonks migration): parallel ID strategy for world_players.
--
-- The owner-approved strategy (gecis_plani.md §5 Adım 3, option A) keeps the
-- legacy API-Football `api_id` as a rollback path and ADDS a parallel
-- `sportmonks_id` plus a `provider` marker. Both IDs are stored side by side so
-- the mirror can be served from either provider and rolled back with one env flag.
--
-- Because the legacy PK was `api_id`, we:
--   1. Drop the legacy PK on api_id and make it nullable (same ids can't exist
--      in both namespaces; SportMonks rows have no API-Football id).
--   2. Add a surrogate uuid PK `id`.
--   3. Add `sportmonks_id` + a partial unique index so upserts can key on it.
--   4. Add `provider` ('api-football' default — matches any pre-existing rows)
--      and supporting indexes.
--
-- Safe to run twice: every statement is idempotent.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'world_players_pkey'
  ) THEN
    ALTER TABLE public.world_players DROP CONSTRAINT world_players_pkey;
  END IF;
END $$;

ALTER TABLE public.world_players ALTER COLUMN api_id DROP NOT NULL;

ALTER TABLE public.world_players ADD COLUMN IF NOT EXISTS id uuid PRIMARY KEY DEFAULT gen_random_uuid();
ALTER TABLE public.world_players ADD COLUMN IF NOT EXISTS sportmonks_id bigint;
ALTER TABLE public.world_players ADD COLUMN IF NOT EXISTS provider text NOT NULL DEFAULT 'api-football';

-- Upsert key for SportMonks-sourced rows. A plain (non-partial) unique index is
-- used on purpose: Postgres treats NULLs as distinct, so API-Football rows with
-- NULL sportmonks_id are all allowed, while non-NULL SportMonks ids stay unique
-- AND PostgREST `upsert(..., { onConflict: "sportmonks_id" })` can infer it.
CREATE UNIQUE INDEX IF NOT EXISTS world_players_sportmonks_uniq
  ON public.world_players (sportmonks_id);

CREATE INDEX IF NOT EXISTS world_players_provider_idx ON public.world_players (provider);
CREATE INDEX IF NOT EXISTS world_players_api_id_idx ON public.world_players (api_id);
