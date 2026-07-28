import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import {
  Trophy, Bell, LogOut, Timer, Settings2, Lock, Flame, CheckCircle2, Crown, Zap,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/Logo";
import { Countdown } from "@/components/Countdown";
import { toast } from "sonner";
import { getOrCreateMyProfile } from "@/lib/profile.functions";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Your Slate — Aurum Fixed" },
      { name: "description", content: "Your private fixed matches feed. Live picks, countdowns, and VIP unlocks." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Dashboard,
});

type Profile = {
  id: string; full_name: string; whatsapp: string; channel: "A" | "B";
  status: "active" | "disabled"; created_at: string;
  is_vip: boolean; free_picks_claimed: number;
};
type Prediction = {
  id: string; channel: "A" | "B"; match_name: string; league: string;
  home_team: string; away_team: string; kickoff_at: string; prediction: string;
  odds: number | null; confidence: number; published: boolean; release_at: string;
  tier: "free" | "vip";
};
type ChannelSettings = { channel: "A" | "B"; next_release_at: string; release_interval_minutes: number };
type Announcement = { id: string; target: "all" | "A" | "B"; title: string; body: string; created_at: string };

function Dashboard() {
  const navigate = useNavigate();
  const fetchProfile = useServerFn(getOrCreateMyProfile);

  const profileQ = useQuery({
    queryKey: ["profile"],
    queryFn: async () => await fetchProfile(),
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
  const isVip = !!profile?.is_vip;

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
      const { data } = await supabase.from("predictions").select("*").order("release_at", { ascending: false });
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

  // Merge picks + announcements into a chronological feed
  const feed = useMemo(() => {
    const picks = (predictionsQ.data ?? [])
      .filter((p) => p.published && new Date(p.release_at) <= new Date())
      .map((p) => ({ kind: "pick" as const, ts: new Date(p.release_at).getTime(), pick: p }));
    const anns = (announcementsQ.data ?? []).map((a) => ({
      kind: "announcement" as const,
      ts: new Date(a.created_at).getTime(),
      announcement: a,
    }));
    // Locked VIP teasers if the user is not VIP — synthesize 3 upcoming locked slots
    const locked = !isVip
      ? Array.from({ length: 3 }).map((_, i) => ({
          kind: "locked" as const,
          ts: Date.now() - i * 60_000 - 1,
          i,
        }))
      : [];
    return [...picks, ...anns, ...locked].sort((a, b) => b.ts - a.ts);
  }, [predictionsQ.data, announcementsQ.data, isVip]);

  if (profileQ.isLoading) return <DashboardSkeleton />;
  if (profileQ.isError) {
    return (
      <div className="min-h-screen grid place-items-center px-4">
        <div className="card-noir rounded-3xl p-8 max-w-sm text-center">
          <h1 className="font-display text-2xl gold-text">We couldn't load your profile</h1>
          <p className="mt-2 text-sm text-muted-foreground">Please try again. If the issue continues, sign out and sign back in.</p>
          <button onClick={() => profileQ.refetch()} className="mt-6 rounded-full gold-bg px-5 py-2 text-sm font-semibold">Try again</button>
        </div>
      </div>
    );
  }
  if (profileQ.data && "needsOnboarding" in profileQ.data && profileQ.data.needsOnboarding) return <DashboardSkeleton />;
  if (!profile) {
    return (
      <div className="min-h-screen grid place-items-center px-4">
        <div className="card-noir rounded-3xl p-8 text-center">
          <p>We couldn't load your member profile.</p>
          <button onClick={() => profileQ.refetch()} className="mt-6 rounded-full gold-bg px-5 py-2 text-sm font-semibold">Try again</button>
        </div>
      </div>
    );
  }
  if (profile.status === "disabled") {
    return (
      <div className="min-h-screen grid place-items-center px-4">
        <div className="card-noir rounded-3xl p-8 max-w-sm text-center">
          <h1 className="font-display text-2xl gold-text">Access paused</h1>
          <p className="mt-2 text-sm text-muted-foreground">Your account is currently disabled. Please contact support.</p>
          <button onClick={signOut} className="mt-6 rounded-full gold-bg px-5 py-2 text-sm font-semibold">Sign out</button>
        </div>
      </div>
    );
  }

  const totalLive = (predictionsQ.data ?? []).filter((p) => p.published && new Date(p.release_at) <= new Date()).length;
  const freeRemaining = Math.max(0, 2 - (profile.free_picks_claimed ?? 0));
  const nextRelease = settingsQ.data?.next_release_at;
  const firstName = profile.full_name.split(" ")[0];

  return (
    <div className="min-h-screen">
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-border/40 backdrop-blur-xl bg-background/70">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 h-16 flex items-center justify-between">
          <Logo />
          <div className="flex items-center gap-2">
            <div className="hidden sm:inline-flex items-center gap-2 rounded-full glass px-3 py-1.5 text-xs">
              <span className="h-1.5 w-1.5 rounded-full bg-gold animate-pulse" />
              Channel {profile.channel}
            </div>
            {isVip ? (
              <span className="rounded-full gold-bg px-3 py-1 text-[10px] font-bold uppercase tracking-widest inline-flex items-center gap-1"><Crown className="h-3 w-3" /> VIP</span>
            ) : (
              <span className="rounded-full glass px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Free</span>
            )}
            <Link to="/admin" className="rounded-full glass px-2.5 py-2 text-xs hover:border-gold/40" title="Admin"><Settings2 className="h-4 w-4" /></Link>
            <button onClick={signOut} className="rounded-full glass px-2.5 py-2 text-xs hover:border-gold/40" title="Sign out"><LogOut className="h-4 w-4" /></button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-4 sm:px-6 py-8 space-y-8">
        {/* HERO STRIP */}
        <motion.section
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
          className="card-fixed rounded-[2rem] p-6 sm:p-10 gold-ring"
        >
          <div className="flex items-start justify-between gap-6 flex-wrap">
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-gold">Welcome back</p>
              <h1 className="mt-2 font-display text-4xl sm:text-6xl leading-none">
                Hello, <span className="gold-text">{firstName}</span>.
              </h1>
              <p className="mt-3 text-sm text-muted-foreground max-w-md">
                Your private fixed-matches feed. New slips drop on the countdown below.
              </p>
            </div>
            <div className="flex flex-col items-end gap-2">
              {!isVip && (
                <div className="rounded-2xl glass p-3 text-right">
                  <div className="text-[10px] uppercase tracking-widest text-gold">Free trial</div>
                  <div className="mt-1 font-display text-2xl gold-text">{freeRemaining}<span className="text-sm text-muted-foreground"> / 2 left</span></div>
                </div>
              )}
              <a href="#upgrade" className="rounded-full gold-bg px-4 py-2 text-xs font-semibold inline-flex items-center gap-1.5">
                {isVip ? <><Flame className="h-3.5 w-3.5" /> VIP member</> : <><Crown className="h-3.5 w-3.5" /> Upgrade to VIP</>}
              </a>
            </div>
          </div>

          {/* Countdown inside hero */}
          <div className="mt-8">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-gold mb-4">
              <Timer className="h-3.5 w-3.5" /> Next fixed match drop
              {settingsQ.data && <span className="text-muted-foreground normal-case tracking-normal">· every {settingsQ.data.release_interval_minutes} min</span>}
            </div>
            {nextRelease ? <Countdown target={nextRelease} onZero={() => predictionsQ.refetch()} /> : <div className="h-24 shimmer rounded-xl" />}
          </div>
        </motion.section>

        {/* Stat pills */}
        <section className="grid grid-cols-3 gap-3">
          {[
            { label: "Live picks", value: totalLive, icon: Zap },
            { label: "Win rate", value: "98%", icon: CheckCircle2 },
            { label: "Since", value: new Date(profile.created_at).toLocaleDateString(undefined, { month: "short", year: "numeric" }), icon: Trophy },
          ].map((s) => (
            <div key={s.label} className="card-noir rounded-2xl p-4 flex items-center gap-3">
              <div className="grid h-9 w-9 place-items-center rounded-full gold-bg shrink-0">
                <s.icon className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground truncate">{s.label}</div>
                <div className="font-display text-xl gold-text truncate">{s.value}</div>
              </div>
            </div>
          ))}
        </section>

        {/* FEED */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-3xl">Your slate</h2>
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Channel {profile.channel}</span>
          </div>

          {feed.length === 0 && (
            <div className="card-noir rounded-2xl p-10 text-center text-sm text-muted-foreground">
              Nothing dropped yet — the countdown above shows the next release.
            </div>
          )}

          {feed.map((item, idx) => {
            if (item.kind === "pick") return <PickCard key={item.pick.id} p={item.pick} />;
            if (item.kind === "announcement") return <AnnouncementCard key={item.announcement.id} a={item.announcement} />;
            return <LockedCard key={`l${item.i}`} idx={idx} />;
          })}
        </section>

        {/* UPGRADE */}
        {!isVip && (
          <section id="upgrade" className="card-fixed rounded-[2rem] p-8 sm:p-12 text-center gold-ring">
            <Crown className="h-8 w-8 text-gold mx-auto" />
            <h2 className="mt-4 font-display text-3xl sm:text-5xl">Unlock every fixed match.</h2>
            <p className="mt-3 text-muted-foreground max-w-md mx-auto text-sm">
              VIP members get every slip, every day, straight to this feed and WhatsApp.
            </p>
            <a
              href="https://wa.me/10000000000?text=I%20want%20to%20upgrade%20to%20VIP"
              target="_blank" rel="noreferrer"
              className="mt-6 inline-flex items-center gap-2 rounded-full gold-bg px-7 py-3 text-sm font-semibold"
            >
              <Crown className="h-4 w-4" /> Contact to go VIP
            </a>
          </section>
        )}
      </div>
    </div>
  );
}

function PickCard({ p }: { p: Prediction }) {
  const isGuaranteed = p.confidence >= 5;
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
      className={`card-fixed rounded-2xl p-6 relative overflow-hidden`}
    >
      <div className="absolute left-0 top-0 bottom-0 w-1 gold-bg" />
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="rounded-full gold-bg px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest">Fixed</span>
          <span className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">{p.league}</span>
          {p.tier === "free" && <span className="rounded-full glass px-2 py-0.5 text-[10px] uppercase tracking-widest text-gold">Free</span>}
        </div>
        {isGuaranteed && (
          <span className="rounded-full gold-bg px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest inline-flex items-center gap-1">
            <Flame className="h-3 w-3" /> Guaranteed
          </span>
        )}
      </div>
      <div className="mt-4 font-display text-2xl sm:text-3xl">
        {p.home_team} <span className="text-muted-foreground">vs</span> {p.away_team}
      </div>
      <div className="mt-1 text-xs text-muted-foreground">{new Date(p.kickoff_at).toLocaleString()}</div>

      <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto] items-end">
        <div>
          <div className="text-[10px] uppercase tracking-widest text-gold">Pick</div>
          <div className="mt-1 font-display text-2xl">{p.prediction}</div>
        </div>
        <div className="flex flex-wrap gap-2">
          {p.odds != null && (
            <span className="rounded-full glass px-3 py-1.5 text-xs">Odds <b className="text-gold ml-1">{p.odds}</b></span>
          )}
          <span className="rounded-full glass px-3 py-1.5 text-xs inline-flex items-center gap-1.5">
            Confidence
            <span className="flex gap-0.5">
              {Array.from({ length: 5 }).map((_, k) => (
                <span key={k} className={`h-1.5 w-1.5 rounded-full ${k < p.confidence ? "bg-gold" : "bg-muted"}`} />
              ))}
            </span>
          </span>
        </div>
      </div>
    </motion.div>
  );
}

function LockedCard({ idx }: { idx: number }) {
  return (
    <div className="card-noir rounded-2xl p-6 relative overflow-hidden">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="rounded-full glass px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest inline-flex items-center gap-1 text-gold">
            <Lock className="h-3 w-3" /> VIP only
          </span>
          <span className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">Premier League</span>
        </div>
      </div>
      <div className="mt-4 font-display text-2xl blur-sm select-none">██████ vs ██████</div>
      <div className="mt-1 text-xs text-muted-foreground blur-sm select-none">Kickoff hidden</div>
      <div className="mt-5 flex items-center justify-between gap-3 flex-wrap">
        <div className="blur-sm select-none">
          <div className="text-[10px] uppercase tracking-widest text-gold">Pick</div>
          <div className="font-display text-xl">Hidden {idx + 1}</div>
        </div>
        <a href="#upgrade" className="rounded-full gold-bg px-4 py-2 text-xs font-semibold inline-flex items-center gap-1.5">
          <Crown className="h-3.5 w-3.5" /> Unlock with VIP
        </a>
      </div>
    </div>
  );
}

function AnnouncementCard({ a }: { a: Announcement }) {
  return (
    <div className="card-noir rounded-2xl p-5 border-l-2 border-gold/60">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-gold" />
          <span className="text-[10px] uppercase tracking-[0.25em] text-gold">Broadcast</span>
        </div>
        <span className="text-[10px] text-muted-foreground">{new Date(a.created_at).toLocaleDateString()}</span>
      </div>
      <h3 className="mt-2 font-display text-xl">{a.title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{a.body}</p>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="min-h-screen p-6 space-y-6 max-w-4xl mx-auto">
      <div className="h-16 shimmer rounded-2xl" />
      <div className="h-56 shimmer rounded-3xl" />
      <div className="grid gap-4 grid-cols-3">
        <div className="h-20 shimmer rounded-2xl" />
        <div className="h-20 shimmer rounded-2xl" />
        <div className="h-20 shimmer rounded-2xl" />
      </div>
      <div className="h-32 shimmer rounded-2xl" />
      <div className="h-32 shimmer rounded-2xl" />
    </div>
  );
}
