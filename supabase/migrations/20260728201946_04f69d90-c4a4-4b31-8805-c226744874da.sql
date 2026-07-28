CREATE TYPE public.prediction_tier AS ENUM ('free', 'vip');

ALTER TABLE public.predictions ADD COLUMN tier public.prediction_tier NOT NULL DEFAULT 'vip';
ALTER TABLE public.profiles ADD COLUMN free_picks_claimed integer NOT NULL DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN is_vip boolean NOT NULL DEFAULT false;

DROP POLICY IF EXISTS predictions_select_by_channel ON public.predictions;

CREATE POLICY predictions_select_by_channel ON public.predictions
FOR SELECT TO authenticated
USING (
  published = true
  AND release_at <= now()
  AND channel = (SELECT profiles.channel FROM public.profiles WHERE profiles.id = auth.uid())
  AND (
    tier = 'free'
    OR (SELECT profiles.is_vip FROM public.profiles WHERE profiles.id = auth.uid()) = true
  )
);