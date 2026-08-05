import { createFileRoute, Link, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { z } from "zod";

import { lovable } from "@/integrations/lovable";
import { useHydrated } from "@/hooks/use-hydrated";
import { Logo } from "@/components/Logo";
import { toast } from "sonner";

const authSearchSchema = z.object({
  reason: z.enum(["expired"]).optional(),
});

export const Route = createFileRoute("/auth")({
  validateSearch: authSearchSchema,
  head: () => ({
    meta: [
      { title: "Sign in — Aurum" },
      { name: "description", content: "Sign in to your Aurum members account with Google." },
      { property: "og:title", content: "Sign in to Aurum" },
      { property: "og:description", content: "Access your private predictions channel." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { reason } = Route.useSearch();
  const hydrated = useHydrated();
  const [googleLoading, setGoogleLoading] = useState(false);

  useEffect(() => {
    if (reason === "expired") {
      toast.info("Your session expired. Please sign in again.");
    }
  }, [reason]);

  if (location.pathname === "/auth/callback") {
    return <Outlet />;
  }

  async function handleGoogle() {
    setGoogleLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: `${window.location.origin}/auth/callback`,
      });
      if (result.error) {
        toast.error(result.error.message || "Google sign-in failed");
        setGoogleLoading(false);
        return;
      }
      if (result.redirected) return;
      navigate({ to: "/auth/callback" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Google sign-in failed");
      setGoogleLoading(false);
    }
  }

  return (
    <div className="min-h-screen grid place-items-center px-4 py-16">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8"><Logo /></div>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-strong rounded-3xl p-8"
        >
          <p className="text-xs uppercase tracking-[0.3em] text-gold text-center">Members access</p>
          <h1 className="mt-2 font-display text-4xl text-center">Welcome back</h1>
          <p className="mt-2 text-sm text-muted-foreground text-center">
            One tap with Google and you're back in your private channel.
          </p>
          <button
            type="button"
            onClick={handleGoogle}
            disabled={googleLoading || !hydrated}
            className="mt-8 w-full rounded-full gold-bg px-6 py-4 text-sm font-semibold inline-flex items-center justify-center gap-2 shadow-[0_0_30px_oklch(0.82_0.14_85/40%)] disabled:opacity-60"
          >
            <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.4 29.3 35.5 24 35.5c-6.4 0-11.5-5.1-11.5-11.5S17.6 12.5 24 12.5c2.9 0 5.6 1.1 7.6 2.9l5.7-5.7C33.6 6.4 29 4.5 24 4.5 13.2 4.5 4.5 13.2 4.5 24S13.2 43.5 24 43.5 43.5 34.8 43.5 24c0-1.2-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.6 19 12.5 24 12.5c2.9 0 5.6 1.1 7.6 2.9l5.7-5.7C33.6 6.4 29 4.5 24 4.5 16.4 4.5 9.9 8.9 6.3 14.7z"/><path fill="#4CAF50" d="M24 43.5c5 0 9.5-1.8 12.9-4.8l-6-5.1c-2 1.5-4.5 2.4-6.9 2.4-5.3 0-9.7-3.1-11.3-7.5l-6.5 5C9.7 39.1 16.3 43.5 24 43.5z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4 5.5l6 5.1c-.4.4 6.7-4.9 6.7-14.6 0-1.2-.1-2.4-.4-3.5z"/></svg>
            {googleLoading ? "Redirecting…" : "Continue with Google"}
          </button>
          <p className="mt-6 text-center text-xs text-muted-foreground">
            New here? <Link to="/register" className="text-gold hover:underline">Join Aurum</Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
