import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { waitForSession } from "@/lib/auth-session";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    // A locally persisted session is the source of truth for "is signed in".
    // Right after sign-in the session can still be mid-write, so wait briefly
    // instead of bouncing on the first empty read.
    const session = await waitForSession(2500);
    if (!session) throw redirect({ to: "/auth", search: { reason: "expired" } });

    const { data, error } = await supabase.auth.getUser();
    if (data?.user) return { user: data.user };

    // Only bounce when the server explicitly rejects the session.
    const status = (error as { status?: number } | null)?.status;
    if (status === 401 || status === 403) {
      throw redirect({ to: "/auth", search: { reason: "expired" } });
    }

    return { user: session.user };
  },
  component: () => <Outlet />,
});

