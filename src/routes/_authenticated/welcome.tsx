import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Crown, Sparkles } from "lucide-react";
import { getOrCreateMyProfile } from "@/lib/profile.functions";
import { Logo } from "@/components/Logo";

export const Route = createFileRoute("/_authenticated/welcome")({
  head: () => ({
    meta: [
      { title: "Welcome to Aurum" },
      { name: "description", content: "Your private channel has been assigned." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: WelcomePage,
});

function WelcomePage() {
  const navigate = useNavigate();
  const fetchProfile = useServerFn(getOrCreateMyProfile);
  const q = useQuery({ queryKey: ["profile"], queryFn: () => fetchProfile() });
  const [phase, setPhase] = useState<"assigning" | "revealed">("assigning");

  const channel =
    q.data && "profile" in q.data && q.data.profile
      ? (q.data.profile.channel as "A" | "B")
      : undefined;

  useEffect(() => {
    if (!channel) return;
    const t = setTimeout(() => setPhase("revealed"), 2200);
    return () => clearTimeout(t);
  }, [channel]);

  useEffect(() => {
    if (q.data && "needsOnboarding" in q.data && q.data.needsOnboarding) {
      navigate({ to: "/onboarding" });
    }
  }, [q.data, navigate]);

  return (
    <div className="min-h-screen relative overflow-hidden grid place-items-center px-4">
      {/* spotlight */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 50% 40% at 50% 30%, oklch(0.82 0.14 85 / 22%), transparent 70%)",
        }}
      />
      <div className="absolute inset-0 pointer-events-none opacity-40"
        style={{
          background: "conic-gradient(from 210deg at 50% 40%, transparent, oklch(0.82 0.14 85 / 8%), transparent 40%)",
          filter: "blur(40px)",
          animation: "gradient-pan 12s ease-in-out infinite",
        }}
      />

      <div className="relative z-10 max-w-md w-full text-center">
        <div className="flex justify-center mb-10"><Logo /></div>

        {phase === "assigning" ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-strong rounded-3xl p-10"
          >
            <p className="text-[10px] uppercase tracking-[0.4em] text-gold">Aurum Fixed</p>
            <h1 className="mt-4 font-display text-4xl">Preparing your channel</h1>
            <p className="mt-2 text-sm text-muted-foreground">Securing your seat in the private circle.</p>

            <div className="mt-10 grid place-items-center">
              <motion.div
                animate={{ opacity: [0.35, 1, 0.35], scale: [0.97, 1, 0.97] }}
                transition={{ duration: 1.6, repeat: Infinity }}
                className="h-28 w-28 rounded-full gold-hairline grid place-items-center font-display text-2xl gold-text tracking-tight"
              >
                AF
              </motion.div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 120, damping: 14 }}
            className="glass-strong rounded-3xl p-10"
          >
            <div className="flex justify-center">
              <motion.div
                initial={{ rotate: -8, scale: 0.8 }}
                animate={{ rotate: 0, scale: 1 }}
                transition={{ delay: 0.1 }}
                className="relative h-28 w-28 rounded-full gold-bg grid place-items-center font-display text-3xl font-bold text-primary-foreground shadow-[0_0_60px_-8px_var(--gold)]"
              >
                AF
                <span className="absolute -top-2 -right-2 h-8 w-8 rounded-full glass-strong grid place-items-center">
                  <Sparkles className="h-4 w-4 text-gold" />
                </span>
              </motion.div>
            </div>

            <p className="mt-8 text-[10px] uppercase tracking-[0.4em] text-gold">You're in</p>
            <h1 className="mt-2 font-display text-4xl">
              Your <span className="gold-text">private channel</span>
            </h1>
            <p className="mt-3 text-sm text-muted-foreground">
              A private feed of fixed picks — delivered on the channel schedule.
            </p>

            <div className="mt-6 rounded-2xl gold-hairline p-4 bg-background/30">
              <div className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-gold">
                <Crown className="h-3 w-3" /> 2 free picks unlocked
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Try before you upgrade. The rest are VIP-only.
              </p>
            </div>


            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              onClick={() => navigate({ to: "/dashboard" })}
              className="mt-8 w-full rounded-full gold-bg px-6 py-4 text-sm font-semibold shadow-[0_0_30px_oklch(0.82_0.14_85/40%)]"
            >
              Enter your channel
            </motion.button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
