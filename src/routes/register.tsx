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
  const [form, setForm] = useState({ full_name: "", whatsapp: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});

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

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
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
