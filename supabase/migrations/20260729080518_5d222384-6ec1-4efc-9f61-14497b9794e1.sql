
-- announcements: image, pinned, author, per-channel target
ALTER TABLE public.announcements ADD COLUMN IF NOT EXISTS image_url text;
ALTER TABLE public.announcements ADD COLUMN IF NOT EXISTS pinned boolean NOT NULL DEFAULT false;
ALTER TABLE public.announcements ADD COLUMN IF NOT EXISTS author_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.announcements ADD COLUMN IF NOT EXISTS channel public.channel_code;

-- Admin write policies (auth.uid() via has_role)
DROP POLICY IF EXISTS announcements_insert_admin ON public.announcements;
CREATE POLICY announcements_insert_admin ON public.announcements
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS announcements_update_admin ON public.announcements;
CREATE POLICY announcements_update_admin ON public.announcements
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS announcements_delete_admin ON public.announcements;
CREATE POLICY announcements_delete_admin ON public.announcements
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- predictions: allow admins to insert/update/delete
DROP POLICY IF EXISTS predictions_insert_admin ON public.predictions;
CREATE POLICY predictions_insert_admin ON public.predictions
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS predictions_update_admin ON public.predictions;
CREATE POLICY predictions_update_admin ON public.predictions
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS predictions_delete_admin ON public.predictions;
CREATE POLICY predictions_delete_admin ON public.predictions
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- profiles: welcome tour flag
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS tour_completed boolean NOT NULL DEFAULT false;
