import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import {
  Trophy, Bell, LogOut, TrendingUp, Timer, Settings2, Home, Zap,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/Logo";
import { Countdown } from "@/components/Countdown";
import { toast } from "sonner";
import { getOrCreateMyProfile } from "@/lib/profile.functions";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Aurum" },
      { name: "description", content: "Your private predictions channel — releases, history, and performance." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Dashboard,
});

type Profile = {
  id: string; full_name: string; whatsapp: string; channel: "A" | "B";
  status: "active" | "disabled"; created_at: string;
};
type Prediction = {
  id: string; channel: "A" | "B"; match_name: string; league: string;
  home_team: string; away_team: string; kickoff_at: string; prediction: string;
  odds: number | null; confidence: number; published: boolean; release_at: string;
};
type ChannelSettings = { channel: "A" | "B"; next_release_at: string; release_interval_minutes: number };
type Announcement = { id: string; target: "all" | "A" | "B"; title: string; body: string; created_at: string };

function Dashboard() {
  const navigate = useNavigate();
  const fetchProfile = useServerFn(getOrCreateMyProfile);
  const [tab, setTab] = useState<"home" | "predictions" | "history" | "alerts">("home");

  const profileQ = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      return await fetchProfile();
    },
    retry: 2,
    retryDelay: 500,
  });

  useEffect(() => {
    if (profileQ.data && "needsOnboarding" in profileQ.data && profileQ.data.needsOnboarding) {
      navigate({ to: "/onboarding" });
    }
  }, [profileQ.data, navigate]);

  const profile: Profile | undefined =
    profileQ.data && "profile" in profileQ.data ? (profileQ.data.profile as Profile) : undefined;
  const channel = profile?.channel;

  const settingsQ = useQuery({
    queryKey: ["channel_settings", channel],
    enabled: !!channel,
    queryFn: async (): Promise<ChannelSettings | null> => {
      const { data } = await supabase.from("channel_settings").select("*").eq("channel", channel!).maybeSingle();
      return (data as ChannelSettings) ?? null;
    },
  });

  const predictionsQ = useQuery({
    queryKey: ["predictions", channel],
    enabled: !!channel,
    queryFn: async (): Promise<Prediction[]> => {
      const { data } = await supabase.from("predictions").select("*").order("kickoff_at", { ascending: false });
      return (data as Prediction[]) ?? [];
    },
  });

  const announcementsQ = useQuery({
    queryKey: ["announcements"],
    queryFn: async (): Promise<Announcement[]> => {
      const { data } = await supabase.from("announcements").select("*").order("created_at", { ascending: false }).limit(20);
      return (data as Announcement[]) ?? [];
    },
  });

  // Realtime
  useEffect(() => {
    if (!channel) return;
    const ch = supabase
      .channel("realtime-user")
      .on("postgres_changes", { event: "*", schema: "public", table: "predictions" }, () => {
        predictionsQ.refetch();
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "announcements" }, (p) => {
        const a = p.new as Announcement;
        if (a.target === "all" || a.target === channel) {
          toast(a.title, { description: a.body });
          announcementsQ.refetch();
        }
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "channel_settings" }, () => {
        settingsQ.refetch();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channel]);

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  }

  if (profileQ.isLoading) return <DashboardSkeleton />;
  if (profileQ.isError) {
    return (
      <div className="min-h-screen grid place-items-center px-4">
        <div className="glass-strong rounded-2xl p-8 max-w-sm text-center">
          <h1 className="font-display text-2xl gold-text">We couldn't load your profile</h1>
          <p className="mt-2 text-sm text-muted-foreground">Please try again. If the issue continues, sign out and sign back in.</p>
          <button
            onClick={() => profileQ.refetch()}
            className="mt-6 rounded-full gold-bg px-5 py-2 text-sm font-semibold"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }
  const profile = profileQ.data;
  if (!profile) {
    return (
      <div className="min-h-screen grid place-items-center px-4">
        <div className="glass-strong rounded-2xl p-8 text-center">
          <p>We couldn't load your member profile.</p>
          <button
            onClick={() => profileQ.refetch()}
            className="mt-6 rounded-full gold-bg px-5 py-2 text-sm font-semibold"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }
  if (profile.status === "disabled") {
    return (
      <div className="min-h-screen grid place-items-center px-4">
        <div className="glass-strong rounded-2xl p-8 max-w-sm text-center">
          <h1 className="font-display text-2xl gold-text">Access paused</h1>
          <p className="mt-2 text-sm text-muted-foreground">Your account is currently disabled. Please contact support.</p>
          <button onClick={signOut} className="mt-6 rounded-full gold-bg px-5 py-2 text-sm font-semibold">Sign out</button>
        </div>
      </div>
    );
  }

  const live = (predictionsQ.data ?? []).filter((p) => p.published && new Date(p.release_at) <= new Date());
  const featured = live[0];
  const nextRelease = settingsQ.data?.next_release_at;

  return (
    <div className="min-h-screen">
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-border/40 backdrop-blur-xl bg-background/70">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 h-16 flex items-center justify-between">
          <Logo />
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-2 rounded-full glass px-3 py-1.5 text-xs">
              <span className="h-1.5 w-1.5 rounded-full bg-gold animate-pulse" />
              Channel {profile.channel}
            </div>
            <button onClick={signOut} className="rounded-full glass px-3 py-2 text-sm hover:border-gold/40 transition inline-flex items-center gap-1.5">
              <LogOut className="h-4 w-4" /> <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8 grid gap-8 lg:grid-cols-[220px_1fr]">
        {/* Sidebar */}
        <aside className="hidden lg:block">
          <nav className="glass rounded-2xl p-3 space-y-1 sticky top-24">
            {[
              { id: "home", label: "Overview", icon: Home },
              { id: "predictions", label: "Live picks", icon: Zap },
              { id: "history", label: "History", icon: TrendingUp },
              { id: "alerts", label: "Announcements", icon: Bell },
            ].map((i) => (
              <button
                key={i.id}
                onClick={() => setTab(i.id as typeof tab)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition ${
                  tab === i.id ? "gold-bg text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                }`}
              >
                <i.icon className="h-4 w-4" /> {i.label}
              </button>
            ))}
            <div className="pt-3 mt-3 border-t border-border/40">
              <Link to="/admin" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-muted-foreground hover:text-gold">
                <Settings2 className="h-4 w-4" /> Admin
              </Link>
            </div>
          </nav>
        </aside>

        <main className="min-w-0 space-y-8">
          <motion.section
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
          >
            <p className="text-xs uppercase tracking-[0.25em] text-gold">Welcome back</p>
            <h1 className="mt-2 font-display text-4xl sm:text-5xl">
              Hello, <span className="gold-text">{profile.full_name.split(" ")[0]}</span>.
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              You're in the Aurum private circle. Predictions are for information only — please play responsibly.
            </p>
          </motion.section>

          {/* Countdown */}
          <section className="glass-strong rounded-3xl p-6 sm:p-8">
            <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-gold flex items-center gap-2"><Timer className="h-3.5 w-3.5" /> Next release</p>
                <h2 className="mt-1 font-display text-2xl sm:text-3xl">Countdown to your next pick</h2>
              </div>
              {nextRelease && <div className="text-xs text-muted-foreground">Every {settingsQ.data?.release_interval_minutes ?? 0} min</div>}
            </div>
            {nextRelease ? <Countdown target={nextRelease} onZero={() => predictionsQ.refetch()} /> : <div className="h-24 shimmer rounded-xl" />}
          </section>

          {/* Featured prediction */}
          {featured && (
            <section className="glass-strong rounded-3xl p-6 sm:p-8">
              <p className="text-xs uppercase tracking-[0.25em] text-gold">Featured pick</p>
              <div className="mt-3 grid gap-6 md:grid-cols-[1fr_auto] items-end">
                <div className="min-w-0">
                  <h2 className="font-display text-3xl sm:text-4xl truncate">{featured.home_team} <span className="text-muted-foreground text-2xl">vs</span> {featured.away_team}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">{featured.league} · {new Date(featured.kickoff_at).toLocaleString()}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <span className="rounded-full glass px-3 py-1 text-xs">Pick: <b className="text-foreground">{featured.prediction}</b></span>
                    {featured.odds && <span className="rounded-full glass px-3 py-1 text-xs">Odds: <b className="text-foreground">{featured.odds}</b></span>}
                    <span className="rounded-full glass px-3 py-1 text-xs flex items-center gap-1">
                      Confidence:{" "}
                      <span className="flex gap-0.5">
                        {Array.from({ length: 5 }).map((_, k) => (
                          <span key={k} className={`h-2 w-2 rounded-full ${k < featured.confidence ? "bg-gold" : "bg-muted"}`} />
                        ))}
                      </span>
                    </span>
                  </div>
                </div>
                <div className="grid h-24 w-24 place-items-center rounded-2xl gold-bg shrink-0">
                  <Trophy className="h-10 w-10 text-primary-foreground" />
                </div>
              </div>
            </section>
          )}

          {/* Predictions list */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-2xl">Recent predictions</h2>
              <span className="text-xs text-muted-foreground">Channel {profile.channel}</span>
            </div>
            <div className="grid gap-4">
              {live.length === 0 && (
                <div className="glass rounded-2xl p-8 text-center text-sm text-muted-foreground">
                  Nothing released yet. Watch the countdown above.
                </div>
              )}
              {live.map((p) => (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                  className="glass rounded-2xl p-5 grid gap-3 sm:grid-cols-[1fr_auto] items-center"
                >
                  <div className="min-w-0">
                    <div className="text-xs text-muted-foreground uppercase tracking-widest">{p.league}</div>
                    <div className="font-display text-xl truncate">{p.home_team} vs {p.away_team}</div>
                    <div className="text-xs text-muted-foreground mt-1">{new Date(p.kickoff_at).toLocaleString()}</div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full gold-bg px-3 py-1 text-xs font-semibold">{p.prediction}</span>
                    {p.odds && <span className="rounded-full glass px-3 py-1 text-xs">{p.odds}</span>}
                  </div>
                </motion.div>
              ))}
            </div>
          </section>

          {/* Stats */}
          <section className="grid gap-4 sm:grid-cols-3">
            {[
              { label: "Total picks", value: (predictionsQ.data ?? []).length },
              { label: "Live now", value: live.length },
              { label: "Member since", value: new Date(profile.created_at).toLocaleDateString() },
            ].map((s) => (
              <div key={s.label} className="glass rounded-2xl p-5">
                <div className="text-xs uppercase tracking-widest text-muted-foreground">{s.label}</div>
                <div className="mt-2 font-display text-3xl gold-text">{s.value}</div>
              </div>
            ))}
          </section>

          {/* Announcements */}
          <section>
            <h2 className="font-display text-2xl mb-4 flex items-center gap-2"><Bell className="h-5 w-5 text-gold" /> Announcements</h2>
            <div className="grid gap-3">
              {(announcementsQ.data ?? []).length === 0 && (
                <div className="glass rounded-2xl p-6 text-sm text-muted-foreground">No announcements yet.</div>
              )}
              {(announcementsQ.data ?? []).map((a) => (
                <div key={a.id} className="glass rounded-2xl p-5">
                  <div className="flex items-center justify-between">
                    <h3 className="font-display text-lg">{a.title}</h3>
                    <span className="text-[10px] uppercase tracking-widest text-muted-foreground">{new Date(a.created_at).toLocaleDateString()}</span>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{a.body}</p>
                </div>
              ))}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="min-h-screen p-6 space-y-6 max-w-7xl mx-auto">
      <div className="h-16 shimmer rounded-2xl" />
      <div className="h-40 shimmer rounded-3xl" />
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="h-28 shimmer rounded-2xl" />
        <div className="h-28 shimmer rounded-2xl" />
        <div className="h-28 shimmer rounded-2xl" />
      </div>
    </div>
  );
}
