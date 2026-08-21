CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  display_name TEXT NOT NULL DEFAULT 'Scout',
  total_xp INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT ON public.profiles TO anon;
GRANT ALL ON public.profiles TO service_role;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE TABLE public.xp_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  game TEXT NOT NULL,
  xp INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX xp_events_user_created_idx ON public.xp_events (user_id, created_at DESC);

GRANT SELECT, INSERT ON public.xp_events TO authenticated;
GRANT ALL ON public.xp_events TO service_role;

ALTER TABLE public.xp_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own xp events" ON public.xp_events FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own xp events" ON public.xp_events FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.award_xp(_game TEXT, _xp INTEGER)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid UUID := auth.uid();
  _total INTEGER;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF _game NOT IN ('higher_lower', 'transfer_path', 'daily_player') THEN
    RAISE EXCEPTION 'Unknown game';
  END IF;
  IF _xp < -200 OR _xp > 500 THEN
    RAISE EXCEPTION 'XP out of range';
  END IF;

  INSERT INTO public.profiles (id) VALUES (_uid) ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.xp_events (user_id, game, xp) VALUES (_uid, _game, _xp);

  UPDATE public.profiles
     SET total_xp = GREATEST(0, total_xp + _xp), updated_at = now()
   WHERE id = _uid
  RETURNING total_xp INTO _total;

  RETURN _total;
END;
$$;

GRANT EXECUTE ON FUNCTION public.award_xp(TEXT, INTEGER) TO authenticated;

CREATE OR REPLACE FUNCTION public.weekly_leaderboard()
RETURNS TABLE (id UUID, display_name TEXT, xp BIGINT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.display_name, COALESCE(SUM(e.xp), 0)::BIGINT AS xp
    FROM public.profiles p
    JOIN public.xp_events e ON e.user_id = p.id
   WHERE e.created_at > now() - INTERVAL '7 days'
   GROUP BY p.id, p.display_name
   HAVING COALESCE(SUM(e.xp), 0) > 0
   ORDER BY xp DESC
   LIMIT 100;
$$;

GRANT EXECUTE ON FUNCTION public.weekly_leaderboard() TO authenticated, anon;