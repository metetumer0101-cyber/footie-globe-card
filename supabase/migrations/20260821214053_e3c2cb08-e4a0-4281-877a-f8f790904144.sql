REVOKE EXECUTE ON FUNCTION public.award_xp(text, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.award_xp(text, integer) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.weekly_leaderboard() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.weekly_leaderboard() TO anon, authenticated;