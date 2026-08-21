CREATE TABLE public.standings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id integer NOT NULL,
  season integer NOT NULL,
  team_id integer NOT NULL,
  team_name text NOT NULL,
  rank integer NOT NULL,
  points integer NOT NULL DEFAULT 0,
  played integer NOT NULL DEFAULT 0,
  wins integer NOT NULL DEFAULT 0,
  draws integer NOT NULL DEFAULT 0,
  losses integer NOT NULL DEFAULT 0,
  goals_for integer NOT NULL DEFAULT 0,
  goals_against integer NOT NULL DEFAULT 0,
  goal_diff integer NOT NULL DEFAULT 0,
  form text,
  logo text,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(league_id, season, team_id)
);

GRANT SELECT ON public.standings TO authenticated;
GRANT SELECT ON public.standings TO anon;
GRANT ALL ON public.standings TO service_role;

ALTER TABLE public.standings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Standings are public" ON public.standings FOR SELECT USING (true);

CREATE TABLE public.match_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fixture_id integer NOT NULL,
  elapsed integer,
  extra_time integer,
  team_id integer,
  team_name text,
  player_id integer,
  player_name text,
  assist_id integer,
  assist_name text,
  type text NOT NULL,
  detail text,
  comments text,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(fixture_id, elapsed, extra_time, team_id, player_id, type, detail)
);

GRANT SELECT ON public.match_events TO authenticated;
GRANT SELECT ON public.match_events TO anon;
GRANT ALL ON public.match_events TO service_role;

ALTER TABLE public.match_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Match events are public" ON public.match_events FOR SELECT USING (true);

CREATE TABLE public.match_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fixture_id integer NOT NULL,
  team_id integer NOT NULL,
  team_name text,
  stat_type text NOT NULL,
  home_value text,
  away_value text,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(fixture_id, team_id, stat_type)
);

GRANT SELECT ON public.match_stats TO authenticated;
GRANT SELECT ON public.match_stats TO anon;
GRANT ALL ON public.match_stats TO service_role;

ALTER TABLE public.match_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Match stats are public" ON public.match_stats FOR SELECT USING (true);

CREATE TABLE public.injuries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id integer,
  player_name text,
  team_id integer,
  team_name text,
  fixture_id integer,
  fixture_date text,
  type text,
  reason text,
  status text,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(player_id, team_id, fixture_id)
);

GRANT SELECT ON public.injuries TO authenticated;
GRANT ALL ON public.injuries TO service_role;

ALTER TABLE public.injuries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Injuries visible to authenticated users" ON public.injuries FOR SELECT TO authenticated USING (true);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_standings_updated_at BEFORE UPDATE ON public.standings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_match_events_updated_at BEFORE UPDATE ON public.match_events FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_match_stats_updated_at BEFORE UPDATE ON public.match_stats FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_injuries_updated_at BEFORE UPDATE ON public.injuries FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();