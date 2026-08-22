CREATE TYPE public.app_role AS ENUM ('admin', 'moderator');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read roles"
  ON public.user_roles
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Service role can manage roles"
  ON public.user_roles
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

CREATE TABLE public.cms_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL CHECK (type IN ('player', 'manager', 'team')),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  api_id integer,
  club text,
  club_badge text,
  nation text,
  league text,
  position text,
  tier text,
  age integer,
  height_cm integer,
  weight_kg integer,
  foot text,
  market_value text,
  contract_until text,
  injuries text,
  form integer,
  career_goals integer,
  win_rate integer,
  style text,
  formation text,
  trophies integer,
  matches integer,
  goals_for integer,
  squad_value text,
  avg_age integer,
  photo text,
  published boolean NOT NULL DEFAULT true,
  core jsonb,
  technical jsonb,
  physical jsonb,
  mental jsonb,
  coach jsonb,
  stats jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT ON public.cms_cards TO anon;
GRANT SELECT ON public.cms_cards TO authenticated;
GRANT ALL ON public.cms_cards TO service_role;

ALTER TABLE public.cms_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view published cards"
  ON public.cms_cards
  FOR SELECT
  TO anon
  USING (published = true);

CREATE POLICY "Authenticated users can view published cards"
  ON public.cms_cards
  FOR SELECT
  TO authenticated
  USING (published = true OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));

CREATE POLICY "Admins and moderators can manage cards"
  ON public.cms_cards
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));

CREATE POLICY "Service role can manage cards"
  ON public.cms_cards
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE TABLE public.cms_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  meta_description text,
  body jsonb NOT NULL DEFAULT '{}'::jsonb,
  published boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT ON public.cms_pages TO anon;
GRANT SELECT ON public.cms_pages TO authenticated;
GRANT ALL ON public.cms_pages TO service_role;

ALTER TABLE public.cms_pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view published pages"
  ON public.cms_pages
  FOR SELECT
  TO anon
  USING (published = true);

CREATE POLICY "Authenticated users can view published pages"
  ON public.cms_pages
  FOR SELECT
  TO authenticated
  USING (published = true OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));

CREATE POLICY "Admins and moderators can manage pages"
  ON public.cms_pages
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));

CREATE POLICY "Service role can manage pages"
  ON public.cms_pages
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE TABLE public.cms_announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  body text,
  link text,
  start_at timestamp with time zone,
  end_at timestamp with time zone,
  active boolean NOT NULL DEFAULT true,
  priority integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT ON public.cms_announcements TO anon;
GRANT SELECT ON public.cms_announcements TO authenticated;
GRANT ALL ON public.cms_announcements TO service_role;

ALTER TABLE public.cms_announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view active announcements"
  ON public.cms_announcements
  FOR SELECT
  TO anon
  USING (active = true AND (start_at IS NULL OR start_at <= now()) AND (end_at IS NULL OR end_at >= now()));

CREATE POLICY "Authenticated users can view active announcements"
  ON public.cms_announcements
  FOR SELECT
  TO authenticated
  USING (active = true AND (start_at IS NULL OR start_at <= now()) AND (end_at IS NULL OR end_at >= now()) OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));

CREATE POLICY "Admins and moderators can manage announcements"
  ON public.cms_announcements
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));

CREATE POLICY "Service role can manage announcements"
  ON public.cms_announcements
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE TABLE public.cms_translations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  locale text NOT NULL,
  namespace text NOT NULL DEFAULT 'common',
  key text NOT NULL,
  value text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (locale, namespace, key)
);

GRANT SELECT ON public.cms_translations TO anon;
GRANT SELECT ON public.cms_translations TO authenticated;
GRANT ALL ON public.cms_translations TO service_role;

ALTER TABLE public.cms_translations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view translations"
  ON public.cms_translations
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Authenticated users can view translations"
  ON public.cms_translations
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins and moderators can manage translations"
  ON public.cms_translations
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));

CREATE POLICY "Service role can manage translations"
  ON public.cms_translations
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE TRIGGER update_cms_cards_updated_at
  BEFORE UPDATE ON public.cms_cards
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_cms_pages_updated_at
  BEFORE UPDATE ON public.cms_pages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_cms_announcements_updated_at
  BEFORE UPDATE ON public.cms_announcements
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_cms_translations_updated_at
  BEFORE UPDATE ON public.cms_translations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();