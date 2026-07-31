import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { z } from "zod";
import { ArrowLeft, ArrowRight, Check, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { waitForSession } from "@/lib/auth-session";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { completeOnboarding } from "@/lib/profile.functions";

import { lovable } from "@/integrations/lovable";
import { useHydrated } from "@/hooks/use-hydrated";
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

const nameSchema = z.string().trim().min(2, "Please enter your full name").max(100);
const waSchema = z.string().trim().min(6, "Please enter a valid WhatsApp number").max(30);

function whatsappToEmail(w: string) {
  const digits = w.replace(/\D/g, "");
  return `wa_${digits}@aurum.members`;
}
function derivePassword(w: string) {
  const digits = w.replace(/\D/g, "");
  return `AurumMember!${digits}#${digits.length}`;
}

const STEPS = [
  { key: "name", label: "Name" },
  { key: "whatsapp", label: "WhatsApp" },
  { key: "confirm", label: "Confirm" },
] as const;

function RegisterPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const saveProfile = useServerFn(completeOnboarding);
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [full_name, setName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [error, setError] = useState("");

  function next() {
    setError("");
    if (step === 0) {
      const r = nameSchema.safeParse(full_name);
      if (!r.success) return setError(r.error.issues[0].message);
    }
    if (step === 1) {
      const r = waSchema.safeParse(whatsapp);
      if (!r.success) return setError(r.error.issues[0].message);
    }
    setDir(1);
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }
  function back() {
    setError("");
    setDir(-1);
    setStep((s) => Math.max(s - 1, 0));
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

  async function submit() {
    setLoading(true);
    try {
      const email = whatsappToEmail(whatsapp);
      const password = derivePassword(whatsapp);
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name, whatsapp },
          emailRedirectTo: `${window.location.origin}/welcome`,
        },
      });
      if (signUpError && !signUpError.message.toLowerCase().includes("already")) {
        throw signUpError;
      }
      let session = data?.session ?? null;
      if (!session) {
        const { data: signInData, error: signInError } =
          await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
        session = signInData.session ?? (await waitForSession());
      }
      if (!session) throw new Error("We couldn't start your session. Please try again.");

      // Persist the details we just collected so /welcome never asks again.
      await saveProfile({ data: { full_name: full_name.trim(), whatsapp: whatsapp.trim() } });
      await queryClient.invalidateQueries({ queryKey: ["profile"] });

      await navigate({ to: "/welcome", replace: true });
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

        {/* Progress */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {STEPS.map((s, i) => (
            <div key={s.key} className="flex items-center gap-2">
              <div
                className={`h-1.5 rounded-full transition-all ${
                  i === step ? "w-8 gold-bg" : i < step ? "w-4 bg-gold/60" : "w-4 bg-muted/50"
                }`}
              />
            </div>
          ))}
        </div>
        <div className="text-center text-[10px] uppercase tracking-[0.35em] text-gold mb-4">
          Step {step + 1} of {STEPS.length} · {STEPS[step].label}
        </div>

        <div className="glass-strong rounded-3xl p-8 overflow-hidden">
          <AnimatePresence mode="wait" custom={dir}>
            <motion.div
              key={step}
              custom={dir}
              initial={{ opacity: 0, x: dir * 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -dir * 30 }}
              transition={{ duration: 0.25 }}
            >
              {step === 0 && (
                <>
                  <h1 className="font-display text-4xl text-center">What's your name?</h1>
                  <p className="mt-2 text-sm text-muted-foreground text-center">
                    We use it to greet you inside your private channel.
                  </p>
                  <div className="mt-6">
                    <label className="text-xs uppercase tracking-widest text-muted-foreground">Full name</label>
                    <input
                      autoFocus
                      value={full_name}
                      onChange={(e) => setName(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && next()}
                      placeholder="Alex Morgan"
                      autoComplete="name"
                      className="mt-2 w-full rounded-xl bg-surface-2 border border-border px-4 py-3 outline-none focus:border-gold transition"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleGoogle}
                    disabled={googleLoading}
                    className="mt-6 w-full rounded-full glass px-6 py-3 text-sm font-semibold hover:border-gold/40 transition inline-flex items-center justify-center gap-2 disabled:opacity-60"
                  >
                    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.4 29.3 35.5 24 35.5c-6.4 0-11.5-5.1-11.5-11.5S17.6 12.5 24 12.5c2.9 0 5.6 1.1 7.6 2.9l5.7-5.7C33.6 6.4 29 4.5 24 4.5 13.2 4.5 4.5 13.2 4.5 24S13.2 43.5 24 43.5 43.5 34.8 43.5 24c0-1.2-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.6 19 12.5 24 12.5c2.9 0 5.6 1.1 7.6 2.9l5.7-5.7C33.6 6.4 29 4.5 24 4.5 16.4 4.5 9.9 8.9 6.3 14.7z"/><path fill="#4CAF50" d="M24 43.5c5 0 9.5-1.8 12.9-4.8l-6-5.1c-2 1.5-4.5 2.4-6.9 2.4-5.3 0-9.7-3.1-11.3-7.5l-6.5 5C9.7 39.1 16.3 43.5 24 43.5z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4 5.5l6 5.1c-.4.4 6.7-4.9 6.7-14.6 0-1.2-.1-2.4-.4-3.5z"/></svg>
                    {googleLoading ? "Redirecting…" : "Or continue with Google"}
                  </button>
                </>
              )}

              {step === 1 && (
                <>
                  <h1 className="font-display text-4xl text-center">Your WhatsApp</h1>
                  <p className="mt-2 text-sm text-muted-foreground text-center">
                    We deliver your fixed picks straight to WhatsApp. It's how we reach you.
                  </p>
                  <div className="mt-6">
                    <label className="text-xs uppercase tracking-widest text-muted-foreground">WhatsApp number</label>
                    <input
                      autoFocus
                      type="tel"
                      value={whatsapp}
                      onChange={(e) => setWhatsapp(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && next()}
                      placeholder="+1 555 000 0000"
                      autoComplete="tel"
                      className="mt-2 w-full rounded-xl bg-surface-2 border border-border px-4 py-3 outline-none focus:border-gold transition"
                    />
                    <p className="mt-2 text-[10px] text-muted-foreground/80">
                      Include your country code. We never share your number.
                    </p>
                  </div>
                </>
              )}

              {step === 2 && (
                <>
                  <h1 className="font-display text-4xl text-center">Confirm</h1>
                  <p className="mt-2 text-sm text-muted-foreground text-center">
                    Review your details. We'll assign your private channel next.
                  </p>
                  <div className="mt-6 rounded-2xl gold-hairline p-5 space-y-3 bg-background/30">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Name</span>
                      <span className="text-sm font-semibold">{full_name}</span>
                    </div>
                    <div className="h-px bg-border/40" />
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase tracking-widest text-muted-foreground">WhatsApp</span>
                      <span className="text-sm font-semibold">{whatsapp}</span>
                    </div>
                  </div>
                  <p className="mt-4 text-[10px] text-center text-muted-foreground/80">
                    By continuing you agree to Aurum's members code of conduct.
                  </p>
                </>
              )}

              {error && <p className="mt-4 text-xs text-destructive text-center">{error}</p>}
            </motion.div>
          </AnimatePresence>

          {/* Nav */}
          <div className="mt-8 flex items-center gap-2">
            {step > 0 && (
              <button
                type="button"
                onClick={back}
                className="rounded-full glass px-4 py-3 text-sm inline-flex items-center gap-1"
              >
                <ArrowLeft className="h-4 w-4" /> Back
              </button>
            )}
            {step < STEPS.length - 1 ? (
              <button
                type="button"
                onClick={next}
                disabled={!hydrated}
                className="flex-1 rounded-full gold-bg px-6 py-3 text-sm font-semibold inline-flex items-center justify-center gap-2 shadow-[0_0_30px_oklch(0.82_0.14_85/40%)] disabled:opacity-60"
              >
                Continue <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={submit}
                disabled={loading || !hydrated}
                className="flex-1 rounded-full gold-bg px-6 py-3 text-sm font-semibold inline-flex items-center justify-center gap-2 shadow-[0_0_30px_oklch(0.82_0.14_85/40%)] disabled:opacity-60"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                {loading ? "Creating access…" : "Enter Aurum"}
              </button>
            )}
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Already a member? <Link to="/auth" className="text-gold hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
