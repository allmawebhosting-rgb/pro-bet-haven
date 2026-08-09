ALTER TABLE public.predictions ADD COLUMN IF NOT EXISTS sport text NOT NULL DEFAULT 'football';

ALTER TABLE public.predictions
  ADD CONSTRAINT predictions_sport_check
  CHECK (sport IN ('football','basketball','tennis','ice_hockey','baseball','cricket','rugby','combat','esports','other'));

UPDATE public.predictions SET sport = 'football' WHERE sport IS NULL;

DROP POLICY IF EXISTS predictions_select_by_channel ON public.predictions;

CREATE POLICY predictions_select_by_channel ON public.predictions
FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR (
    published = true
    AND release_at <= now()
    AND channel = (SELECT profiles.channel FROM public.profiles WHERE profiles.id = auth.uid())
    AND (
      tier = 'free'
      OR (SELECT profiles.is_vip FROM public.profiles WHERE profiles.id = auth.uid()) = true
    )
  )
);