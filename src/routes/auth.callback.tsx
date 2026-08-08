import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { waitForSession } from "@/lib/auth-session";

export const Route = createFileRoute("/auth/callback")({
  head: () => ({
    meta: [
      { title: "Signing you in — Aurum" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthCallback,
});

function AuthCallback() {
  const navigate = useNavigate();
  const [msg, setMsg] = useState("Finishing sign-in…");

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    let redirecting = false;

    const redirectToAuth = (message: string) => {
      if (cancelled) return;
      setMsg(message);
      timer = setTimeout(() => {
        if (!cancelled) navigate({ to: "/auth" });
      }, 1500);
    };

    const goToDashboard = async () => {
      if (cancelled || redirecting) return;
      redirecting = true;
      setMsg("Opening your private channel…");

      // The auth event can fire just before Supabase finishes persisting the
      // session. Wait for the stored session before entering the guarded route.
      const session = await waitForSession(6000);
      if (cancelled) return;
      if (session) {
        clearTimeout(timer);
        await navigate({ to: "/dashboard" });
        return;
      }

      redirecting = false;
      redirectToAuth("We couldn't complete sign-in. Please try again.");
    };

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) void goToDashboard();
    });

    timer = setTimeout(() => {
      redirectToAuth("Sign-in is taking too long. Please try again.");
    }, 8000);

    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          redirectToAuth("We couldn't complete sign-in. Please try again.");
          return;
        }
        if (data.session) {
          void goToDashboard();
          return;
        }
        redirectToAuth("We couldn't complete sign-in. Please try again.");
      })
      .catch(() => {
        redirectToAuth("We couldn't complete sign-in. Please try again.");
      });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
      clearTimeout(timer);
    };
  }, [navigate]);

  return (
    <div className="min-h-screen grid place-items-center px-4">
      <div className="glass-strong rounded-2xl p-8 text-center">
        <p className="text-sm text-muted-foreground">{msg}</p>
      </div>
    </div>
  );
}
