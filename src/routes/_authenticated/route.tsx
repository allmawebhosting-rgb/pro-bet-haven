import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    // A locally persisted session is the source of truth for "is signed in".
    // getUser() is a network call; a transient failure must not sign the user out.
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) throw redirect({ to: "/auth" });

    const { data, error } = await supabase.auth.getUser();
    if (data?.user) return { user: data.user };

    // Only bounce when the server explicitly rejects the session.
    const status = (error as { status?: number } | null)?.status;
    if (status === 401 || status === 403) throw redirect({ to: "/auth" });

    return { user: sessionData.session.user };
  },
  component: () => <Outlet />,
});

