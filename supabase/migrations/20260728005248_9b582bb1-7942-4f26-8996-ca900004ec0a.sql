DROP POLICY IF EXISTS profiles_select_own ON public.profiles;
DROP POLICY IF EXISTS profiles_update_own ON public.profiles;
DROP POLICY IF EXISTS user_roles_select_own ON public.user_roles;
DROP POLICY IF EXISTS predictions_select_by_channel ON public.predictions;
DROP POLICY IF EXISTS announcements_select_targeted ON public.announcements;

CREATE POLICY profiles_select_own
ON public.profiles
FOR SELECT
TO authenticated
USING (id = auth.uid());

CREATE POLICY profiles_update_own
ON public.profiles
FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

CREATE POLICY user_roles_select_own
ON public.user_roles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY predictions_select_by_channel
ON public.predictions
FOR SELECT
TO authenticated
USING (
  published = true
  AND release_at <= now()
  AND channel = (
    SELECT profiles.channel
    FROM public.profiles
    WHERE profiles.id = auth.uid()
  )
);

CREATE POLICY announcements_select_targeted
ON public.announcements
FOR SELECT
TO authenticated
USING (
  target = 'all'
  OR target::text = (
    SELECT profiles.channel::text
    FROM public.profiles
    WHERE profiles.id = auth.uid()
  )
);

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;