import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

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
    let timer: ReturnType<typeof setTimeout> | undefined;

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!cancelled && session) navigate({ to: "/welcome" });
    });

    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      if (data.session) {
        navigate({ to: "/welcome" });
        return;
      }
      timer = setTimeout(() => {
        if (cancelled) return;
        setMsg("We couldn't complete sign-in. Redirecting you back…");
        navigate({ to: "/auth" });
      }, 8000);
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
      if (timer) clearTimeout(timer);
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
