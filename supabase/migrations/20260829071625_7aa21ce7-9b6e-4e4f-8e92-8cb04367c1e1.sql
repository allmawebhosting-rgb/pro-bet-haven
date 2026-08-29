CREATE TYPE public.unlock_status AS ENUM ('pending','approved','rejected');

CREATE TABLE public.share_unlocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  prediction_id uuid NOT NULL REFERENCES public.predictions(id) ON DELETE CASCADE,
  status public.unlock_status NOT NULL DEFAULT 'pending',
  proof_image_url text,
  note text,
  reviewed_at timestamptz,
  reviewed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, prediction_id)
);

GRANT SELECT, INSERT, UPDATE ON public.share_unlocks TO authenticated;
GRANT ALL ON public.share_unlocks TO service_role;

ALTER TABLE public.share_unlocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "share_unlocks_select_own_or_admin" ON public.share_unlocks
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "share_unlocks_insert_own" ON public.share_unlocks
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND status = 'pending');

CREATE POLICY "share_unlocks_update_admin" ON public.share_unlocks
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_share_unlocks_updated_at
  BEFORE UPDATE ON public.share_unlocks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();