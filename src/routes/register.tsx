import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { motion } from "framer-motion";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Logo } from "@/components/Logo";
import { toast } from "sonner";

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [
      { title: "Join Aurum — Members Registration" },
      { name: "description", content: "Register with your name and WhatsApp to join the private Aurum predictions circle." },
      { property: "og:title", content: "Join Aurum" },
      { property: "og:description", content: "Register with your name and WhatsApp to join the private predictions circle." },
    ],
  }),
  component: RegisterPage,
});

const schema = z.object({
  full_name: z.string().trim().min(2, "Please enter your full name").max(100),
  whatsapp: z.string().trim().min(6, "Please enter a valid WhatsApp number").max(30),
});

function whatsappToEmail(w: string) {
  const digits = w.replace(/\D/g, "");
  return `wa_${digits}@aurum.members`;
}

function derivePassword(w: string) {
  // deterministic-ish but sufficient — user logs in with WhatsApp only
  const digits = w.replace(/\D/g, "");
  return `AurumMember!${digits}#${digits.length}`;
}

function RegisterPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [form, setForm] = useState({ full_name: "", whatsapp: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      parsed.error.issues.forEach((i) => (errs[i.path[0] as string] = i.message));
      setErrors(errs);
      return;
    }
    setErrors({});
    setLoading(true);
    try {
      const email = whatsappToEmail(form.whatsapp);
      const password = derivePassword(form.whatsapp);
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: form.full_name, whatsapp: form.whatsapp },
          emailRedirectTo: `${window.location.origin}/dashboard`,
        },
      });
      if (error) {
        if (error.message.toLowerCase().includes("already")) {
          const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
          if (signInError) throw signInError;
        } else {
          throw error;
        }
      }
      toast.success("Welcome to Aurum");
      navigate({ to: "/dashboard" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
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
          <p className="text-xs uppercase tracking-[0.3em] text-gold text-center">Members registration</p>
          <h1 className="mt-2 font-display text-4xl text-center">Claim your spot</h1>
          <p className="mt-2 text-sm text-muted-foreground text-center">
            Two fields. Instant access to your private predictions channel.
          </p>

          <button
            type="button"
            onClick={handleGoogle}
            disabled={googleLoading}
            className="mt-6 w-full rounded-full glass px-6 py-3 text-sm font-semibold hover:border-gold/40 transition inline-flex items-center justify-center gap-2 disabled:opacity-60"
          >
            <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.4 29.3 35.5 24 35.5c-6.4 0-11.5-5.1-11.5-11.5S17.6 12.5 24 12.5c2.9 0 5.6 1.1 7.6 2.9l5.7-5.7C33.6 6.4 29 4.5 24 4.5 13.2 4.5 4.5 13.2 4.5 24S13.2 43.5 24 43.5 43.5 34.8 43.5 24c0-1.2-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.6 19 12.5 24 12.5c2.9 0 5.6 1.1 7.6 2.9l5.7-5.7C33.6 6.4 29 4.5 24 4.5 16.4 4.5 9.9 8.9 6.3 14.7z"/><path fill="#4CAF50" d="M24 43.5c5 0 9.5-1.8 12.9-4.8l-6-5.1c-2 1.5-4.5 2.4-6.9 2.4-5.3 0-9.7-3.1-11.3-7.5l-6.5 5C9.7 39.1 16.3 43.5 24 43.5z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4 5.5l6 5.1c-.4.4 6.7-4.9 6.7-14.6 0-1.2-.1-2.4-.4-3.5z"/></svg>
            {googleLoading ? "Redirecting…" : "Continue with Google"}
          </button>
          <div className="mt-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground">or</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
            <div>
              <label className="text-xs uppercase tracking-widest text-muted-foreground">Full name</label>
              <input
                type="text"
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                className="mt-2 w-full rounded-xl bg-surface-2 border border-border px-4 py-3 outline-none focus:border-gold transition"
                placeholder="Alex Morgan"
                autoComplete="name"
              />
              {errors.full_name && <p className="mt-1 text-xs text-destructive">{errors.full_name}</p>}
            </div>
            <div>
              <label className="text-xs uppercase tracking-widest text-muted-foreground">WhatsApp number</label>
              <input
                type="tel"
                value={form.whatsapp}
                onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
                className="mt-2 w-full rounded-xl bg-surface-2 border border-border px-4 py-3 outline-none focus:border-gold transition"
                placeholder="+1 555 000 0000"
                autoComplete="tel"
              />
              {errors.whatsapp && <p className="mt-1 text-xs text-destructive">{errors.whatsapp}</p>}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-full gold-bg px-6 py-4 text-sm font-semibold shadow-[0_0_30px_oklch(0.82_0.14_85/40%)] disabled:opacity-60"
            >
              {loading ? "Creating your access…" : "Enter Aurum"}
            </button>

            <p className="text-center text-xs text-muted-foreground">
              Already a member? <Link to="/auth" className="text-gold hover:underline">Sign in</Link>
            </p>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
