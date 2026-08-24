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

CREATE UNIQUE INDEX IF NOT EXISTS world_players_sportmonks_uniq
  ON public.world_players (sportmonks_id);

CREATE INDEX IF NOT EXISTS world_players_provider_idx ON public.world_players (provider);
CREATE INDEX IF NOT EXISTS world_players_api_id_idx ON public.world_players (api_id);