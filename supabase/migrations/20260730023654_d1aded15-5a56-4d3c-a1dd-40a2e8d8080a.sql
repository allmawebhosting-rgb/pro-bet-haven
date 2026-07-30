CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TYPE public.request_kind AS ENUM ('upgrade', 'next_game', 'general');
CREATE TYPE public.request_status AS ENUM ('open', 'answered', 'closed');
CREATE TYPE public.message_sender_role AS ENUM ('member', 'admin');

CREATE TABLE public.member_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  kind public.request_kind NOT NULL DEFAULT 'general',
  subject text NOT NULL,
  status public.request_status NOT NULL DEFAULT 'open',
  last_message_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.member_requests TO authenticated;
GRANT ALL ON public.member_requests TO service_role;
ALTER TABLE public.member_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "member_requests_select_own_or_admin" ON public.member_requests
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "member_requests_insert_own" ON public.member_requests
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "member_requests_update_admin" ON public.member_requests
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.request_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.member_requests(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  sender_role public.message_sender_role NOT NULL,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.request_messages TO authenticated;
GRANT ALL ON public.request_messages TO service_role;
ALTER TABLE public.request_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "request_messages_select_own_or_admin" ON public.request_messages
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (SELECT 1 FROM public.member_requests r WHERE r.id = request_id AND r.user_id = auth.uid())
  );
CREATE POLICY "request_messages_insert_own_or_admin" ON public.request_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND (
      public.has_role(auth.uid(), 'admin')
      OR EXISTS (SELECT 1 FROM public.member_requests r WHERE r.id = request_id AND r.user_id = auth.uid())
    )
  );

CREATE INDEX idx_member_requests_last_message ON public.member_requests (last_message_at DESC);
CREATE INDEX idx_request_messages_request ON public.request_messages (request_id, created_at);

CREATE TRIGGER update_member_requests_updated_at
  BEFORE UPDATE ON public.member_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();