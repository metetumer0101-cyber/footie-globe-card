CREATE TABLE public.world_players (
  api_id integer PRIMARY KEY,
  name text NOT NULL,
  firstname text,
  lastname text,
  age integer,
  nationality text,
  position text,
  photo text,
  club text,
  club_id integer,
  league text,
  league_id integer,
  season integer,
  rating numeric,
  appearances integer,
  minutes integer,
  goals integer,
  assists integer,
  height_cm integer,
  weight_kg integer,
  injured boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX world_players_name_trgm ON public.world_players USING gin (to_tsvector('simple', name));
CREATE INDEX world_players_league_idx ON public.world_players (league_id);
CREATE INDEX world_players_position_idx ON public.world_players (position);
CREATE INDEX world_players_nationality_idx ON public.world_players (nationality);

GRANT SELECT ON public.world_players TO anon;
GRANT SELECT ON public.world_players TO authenticated;
GRANT ALL ON public.world_players TO service_role;

ALTER TABLE public.world_players ENABLE ROW LEVEL SECURITY;

CREATE POLICY "World players are publicly readable"
  ON public.world_players FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE TABLE public.api_usage (
  day date NOT NULL DEFAULT (now() AT TIME ZONE 'utc')::date,
  endpoint text NOT NULL,
  requests integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (day, endpoint)
);

GRANT SELECT ON public.api_usage TO authenticated;
GRANT ALL ON public.api_usage TO service_role;

ALTER TABLE public.api_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and moderators can view API usage"
  ON public.api_usage FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role));

CREATE OR REPLACE FUNCTION public.increment_api_usage(_endpoint text, _count integer DEFAULT 1)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO public.api_usage (day, endpoint, requests, updated_at)
  VALUES ((now() AT TIME ZONE 'utc')::date, _endpoint, _count, now())
  ON CONFLICT (day, endpoint)
  DO UPDATE SET requests = api_usage.requests + EXCLUDED.requests, updated_at = now();
$$;

REVOKE ALL ON FUNCTION public.increment_api_usage(text, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_api_usage(text, integer) TO service_role;