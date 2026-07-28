import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { completeOnboarding } from "@/lib/profile.functions";
import { Logo } from "@/components/Logo";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({
    meta: [
      { title: "Complete your profile — Aurum" },
      { name: "description", content: "One last step to unlock your private predictions channel." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: OnboardingPage,
});

const schema = z.object({
  full_name: z.string().trim().min(2, "Please enter your full name").max(100),
  whatsapp: z.string().trim().min(6, "Please enter a valid WhatsApp number").max(30),
});

function OnboardingPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const submit = useServerFn(completeOnboarding);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ full_name: "", whatsapp: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const meta = (data.user?.user_metadata ?? {}) as { full_name?: string; name?: string };
      const suggested = (meta.full_name || meta.name || "").trim();
      if (suggested) setForm((f) => (f.full_name ? f : { ...f, full_name: suggested }));
    });
  }, []);

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
      await submit({ data: parsed.data });
      await queryClient.invalidateQueries({ queryKey: ["profile"] });
      toast.success("Welcome to Aurum");
      navigate({ to: "/dashboard" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
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
          <p className="text-xs uppercase tracking-[0.3em] text-gold text-center">Almost there</p>
          <h1 className="mt-2 font-display text-4xl text-center">Complete your profile</h1>
          <p className="mt-2 text-sm text-muted-foreground text-center">
            Add your WhatsApp number so we can deliver your private predictions.
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
              {loading ? "Finalizing…" : "Enter Aurum"}
            </button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
