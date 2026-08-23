-- Weekly XI game added to the award_xp allowlist.
-- Recreates award_xp to accept the new 'weekly_xi' game key alongside the
-- existing ones. Includes a per-day cap so the game can't be farmed for XP.
CREATE OR REPLACE FUNCTION public.award_xp(_game TEXT, _xp INTEGER)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid UUID := auth.uid();
  _total INTEGER;
  _played_today INTEGER;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF _game NOT IN ('higher_lower', 'transfer_path', 'daily_player', 'weekly_xi') THEN
    RAISE EXCEPTION 'Unknown game';
  END IF;
  IF _xp < -200 OR _xp > 500 THEN
    RAISE EXCEPTION 'XP out of range';
  END IF;
  IF _game = 'weekly_xi' AND _xp > 0 THEN
    SELECT COUNT(*) INTO _played_today
      FROM public.xp_events
     WHERE user_id = _uid AND game = 'weekly_xi'
       AND created_at >= CURRENT_DATE;
    IF _played_today > 0 THEN
      RAISE EXCEPTION 'Weekly XI already played today';
    END IF;
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
