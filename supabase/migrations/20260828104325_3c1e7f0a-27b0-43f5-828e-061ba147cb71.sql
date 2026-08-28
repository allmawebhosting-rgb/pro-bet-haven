DROP POLICY IF EXISTS predictions_select_by_channel ON public.predictions;

CREATE POLICY predictions_select_by_channel
ON public.predictions
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR (
    published = true
    AND channel = (SELECT p.channel FROM public.profiles p WHERE p.id = auth.uid())
  )
);