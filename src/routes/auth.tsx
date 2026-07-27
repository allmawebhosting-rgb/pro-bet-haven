import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/Logo";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Aurum" },
      { name: "description", content: "Sign in to your Aurum members account." },
      { property: "og:title", content: "Sign in to Aurum" },
      { property: "og:description", content: "Access your private predictions channel." },
    ],
  }),
  component: AuthPage,
});

function whatsappToEmail(w: string) {
  const digits = w.replace(/\D/g, "");
  return `wa_${digits}@aurum.members`;
}
function derivePassword(w: string) {
  const digits = w.replace(/\D/g, "");
  return `AurumMember!${digits}#${digits.length}`;
}

function AuthPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [whatsapp, setWhatsapp] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (whatsapp.replace(/\D/g, "").length < 6) {
      toast.error("Please enter a valid WhatsApp number");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: whatsappToEmail(whatsapp),
        password: derivePassword(whatsapp),
      });
      if (error) throw error;
      navigate({ to: "/dashboard" });
    } catch (err) {
      toast.error("No account found. Please register first.");
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
          <p className="text-xs uppercase tracking-[0.3em] text-gold text-center">Members access</p>
          <h1 className="mt-2 font-display text-4xl text-center">Welcome back</h1>
          <p className="mt-2 text-sm text-muted-foreground text-center">
            Sign in with your registered WhatsApp number.
          </p>
          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div>
              <label className="text-xs uppercase tracking-widest text-muted-foreground">WhatsApp number</label>
              <input
                type="tel"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                className="mt-2 w-full rounded-xl bg-surface-2 border border-border px-4 py-3 outline-none focus:border-gold transition"
                placeholder="+1 555 000 0000"
                autoComplete="tel"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-full gold-bg px-6 py-4 text-sm font-semibold shadow-[0_0_30px_oklch(0.82_0.14_85/40%)] disabled:opacity-60"
            >
              {loading ? "Signing in…" : "Sign in"}
            </button>
            <p className="text-center text-xs text-muted-foreground">
              New here? <Link to="/register" className="text-gold hover:underline">Create account</Link>
            </p>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
