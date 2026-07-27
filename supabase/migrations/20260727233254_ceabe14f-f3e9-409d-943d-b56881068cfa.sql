
-- ENUMS
CREATE TYPE public.app_role AS ENUM ('admin', 'user');
CREATE TYPE public.channel_code AS ENUM ('A', 'B');
CREATE TYPE public.user_status AS ENUM ('active', 'disabled');
CREATE TYPE public.announcement_target AS ENUM ('all', 'A', 'B');

-- PROFILES
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  whatsapp TEXT NOT NULL,
  channel public.channel_code NOT NULL,
  status public.user_status NOT NULL DEFAULT 'active',
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- USER ROLES
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

-- PREDICTIONS
CREATE TABLE public.predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel public.channel_code NOT NULL,
  match_name TEXT NOT NULL,
  league TEXT NOT NULL,
  home_team TEXT NOT NULL,
  away_team TEXT NOT NULL,
  kickoff_at TIMESTAMPTZ NOT NULL,
  prediction TEXT NOT NULL,
  odds NUMERIC(5,2),
  confidence INT NOT NULL DEFAULT 3 CHECK (confidence BETWEEN 1 AND 5),
  published BOOLEAN NOT NULL DEFAULT false,
  release_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.predictions TO authenticated;
GRANT ALL ON public.predictions TO service_role;
ALTER TABLE public.predictions ENABLE ROW LEVEL SECURITY;

-- CHANNEL SETTINGS
CREATE TABLE public.channel_settings (
  channel public.channel_code PRIMARY KEY,
  next_release_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '1 day'),
  release_interval_minutes INT NOT NULL DEFAULT 1440,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.channel_settings TO authenticated;
GRANT ALL ON public.channel_settings TO service_role;
ALTER TABLE public.channel_settings ENABLE ROW LEVEL SECURITY;
INSERT INTO public.channel_settings (channel) VALUES ('A'), ('B');

-- ANNOUNCEMENTS
CREATE TABLE public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target public.announcement_target NOT NULL DEFAULT 'all',
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.announcements TO authenticated;
GRANT ALL ON public.announcements TO service_role;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- SITE SETTINGS (singleton)
CREATE TABLE public.site_settings (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  site_name TEXT NOT NULL DEFAULT 'Aurum Predictions',
  tagline TEXT NOT NULL DEFAULT 'Premium Sports Predictions',
  logo_url TEXT,
  primary_color TEXT NOT NULL DEFAULT '#D4AF37',
  accent_color TEXT NOT NULL DEFAULT '#F5D57A',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.site_settings TO anon, authenticated;
GRANT ALL ON public.site_settings TO service_role;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
INSERT INTO public.site_settings (id) VALUES (1);

-- POLICIES
-- profiles
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

-- user_roles
CREATE POLICY "user_roles_select_own" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- predictions
CREATE POLICY "predictions_select_by_channel" ON public.predictions FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR (
      published = true
      AND release_at <= now()
      AND channel = (SELECT channel FROM public.profiles WHERE id = auth.uid())
    )
  );

-- channel_settings
CREATE POLICY "channel_settings_select" ON public.channel_settings FOR SELECT TO authenticated
  USING (true);

-- announcements
CREATE POLICY "announcements_select_targeted" ON public.announcements FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR target = 'all'
    OR target::text = (SELECT channel::text FROM public.profiles WHERE id = auth.uid())
  );

-- site_settings public read
CREATE POLICY "site_settings_public_read" ON public.site_settings FOR SELECT
  USING (true);

-- TRIGGER: create profile with random channel on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  assigned public.channel_code;
BEGIN
  assigned := CASE WHEN random() < 0.5 THEN 'A'::public.channel_code ELSE 'B'::public.channel_code END;
  INSERT INTO public.profiles (id, full_name, whatsapp, channel)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Member'),
    COALESCE(NEW.raw_user_meta_data->>'whatsapp', ''),
    assigned
  );
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.predictions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.announcements;
ALTER PUBLICATION supabase_realtime ADD TABLE public.channel_settings;
