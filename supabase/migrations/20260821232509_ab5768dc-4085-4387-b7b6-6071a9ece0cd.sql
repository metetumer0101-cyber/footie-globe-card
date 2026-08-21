REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM anon, authenticated;

CREATE POLICY "No API cache access via PostgREST" ON public.api_cache FOR ALL USING (false);