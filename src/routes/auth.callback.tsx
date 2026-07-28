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

    async function check() {
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      if (data.session) {
        navigate({ to: "/dashboard" });
        return true;
      }
      return false;
    }

    check().then((ok) => {
      if (ok) return;
      const { data: sub } = supabase.auth.onAuthStateChange((event) => {
        if (event === "SIGNED_IN") {
          navigate({ to: "/dashboard" });
        }
      });
      const timer = setTimeout(() => {
        setMsg("We couldn't complete sign-in. Please try again.");
      }, 8000);
      return () => {
        sub.subscription.unsubscribe();
        clearTimeout(timer);
      };
    });

    return () => {
      cancelled = true;
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
