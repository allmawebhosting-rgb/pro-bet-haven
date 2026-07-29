import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BadgeCheck, Bell, LogOut, Lock, Crown, Eye, Pin, Trophy,
  Settings2, Timer, Flame, Volume2, ChevronDown,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Countdown } from "@/components/Countdown";
import { toast } from "sonner";
import { getOrCreateMyProfile } from "@/lib/profile.functions";
import { amIAdmin, markTourCompleted } from "@/lib/channel.functions";
import { AdminComposer } from "@/components/channel/AdminComposer";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Your Channel — Aurum Fixed" },
      { name: "description", content: "Your private fixed matches channel. Broadcasts, countdowns, and VIP unlocks." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Dashboard,
});

type Profile = {
  id: string; full_name: string; whatsapp: string; channel: "A" | "B";
  status: "active" | "disabled"; created_at: string;
  is_vip: boolean; free_picks_claimed: number;
  tour_completed?: boolean;
};
type Prediction = {
  id: string; channel: "A" | "B"; match_name: string; league: string;
  home_team: string; away_team: string; kickoff_at: string; prediction: string;
  odds: number | null; confidence: number; published: boolean; release_at: string;
  tier: "free" | "vip";
};
type ChannelSettings = { channel: "A" | "B"; next_release_at: string; release_interval_minutes: number };
type Announcement = {
  id: string; target: "all" | "A" | "B"; title: string; body: string; created_at: string;
  channel?: "A" | "B" | null; pinned?: boolean; image_url?: string | null;
};

const CHANNEL_META: Record<"A" | "B", { name: string; handle: string; subs: string; hue: string }> = {
  A: { name: "Aurum Fixed · Alpha", handle: "@aurum_alpha", subs: "12,847", hue: "A" },
  B: { name: "Aurum Fixed · Bravo", handle: "@aurum_bravo", subs: "9,412", hue: "B" },
};

function Dashboard() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const fetchProfile = useServerFn(getOrCreateMyProfile);
  const fetchAdmin = useServerFn(amIAdmin);
  const doMarkTour = useServerFn(markTourCompleted);

  const profileQ = useQuery({
    queryKey: ["profile"],
    queryFn: async () => await fetchProfile(),
    retry: 2, retryDelay: 500,
  });

  const adminQ = useQuery({
    queryKey: ["am-admin"],
    queryFn: async () => await fetchAdmin(),
    staleTime: 60_000,
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
      const { data } = await supabase.from("predictions").select("*").order("release_at", { ascending: true });
      return (data as Prediction[]) ?? [];
    },
  });

  const announcementsQ = useQuery({
    queryKey: ["announcements", channel],
    enabled: !!channel,
    queryFn: async (): Promise<Announcement[]> => {
      const { data } = await supabase.from("announcements").select("*").order("created_at", { ascending: true }).limit(50);
      const rows = (data as Announcement[]) ?? [];
      return rows.filter((a) => a.target === "all" || a.target === channel);
    },
  });

  const isAdmin = !!adminQ.data?.admin;

  useEffect(() => {
    if (!channel) return;
    const ch = supabase
      .channel("realtime-user")
      .on("postgres_changes", { event: "*", schema: "public", table: "predictions" }, () => predictionsQ.refetch())
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "announcements" }, (p) => {
        const a = p.new as Announcement;
        if (a.target === "all" || a.target === channel) {
          toast(a.title, { description: a.body });
          announcementsQ.refetch();
        }
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "channel_settings" }, () => settingsQ.refetch())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channel]);

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  }

  const feed = useMemo(() => {
    const now = Date.now();
    const picks = (predictionsQ.data ?? [])
      .filter((p) => p.published && new Date(p.release_at).getTime() <= now)
      .map((p) => ({ kind: "pick" as const, ts: new Date(p.release_at).getTime(), pick: p }));
    const anns = (announcementsQ.data ?? []).map((a) => ({
      kind: "announcement" as const, ts: new Date(a.created_at).getTime(), announcement: a,
    }));
    const locked = !isVip
      ? Array.from({ length: 3 }).map((_, i) => ({
          kind: "locked" as const, ts: now - i * 45_000, i,
        }))
      : [];
    // ascending (oldest at top, newest at bottom — like Telegram)
    return [...picks, ...anns, ...locked].sort((a, b) => a.ts - b.ts);
  }, [predictionsQ.data, announcementsQ.data, isVip]);

  if (profileQ.isLoading) return <FeedSkeleton />;
  if (profileQ.isError || !profile) {
    return (
      <div className="min-h-screen grid place-items-center px-4">
        <div className="card-noir rounded-3xl p-8 max-w-sm text-center">
          <h1 className="font-display text-2xl gold-text">Channel unavailable</h1>
          <p className="mt-2 text-sm text-muted-foreground">We couldn't load your channel. Please try again.</p>
          <button onClick={() => profileQ.refetch()} className="mt-6 rounded-full gold-bg px-5 py-2 text-sm font-semibold">Retry</button>
        </div>
      </div>
    );
  }
  if (profileQ.data && "needsOnboarding" in profileQ.data && profileQ.data.needsOnboarding) return <FeedSkeleton />;
  if (profile.status === "disabled") {
    return (
      <div className="min-h-screen grid place-items-center px-4">
        <div className="card-noir rounded-3xl p-8 max-w-sm text-center">
          <h1 className="font-display text-2xl gold-text">Access paused</h1>
          <p className="mt-2 text-sm text-muted-foreground">Your account is disabled. Contact support.</p>
          <button onClick={signOut} className="mt-6 rounded-full gold-bg px-5 py-2 text-sm font-semibold">Sign out</button>
        </div>
      </div>
    );
  }

  const meta = CHANNEL_META[profile.channel];
  const freeRemaining = Math.max(0, 2 - (profile.free_picks_claimed ?? 0));
  const nextRelease = settingsQ.data?.next_release_at;

  return (
    <div className="min-h-screen">
      {/* Channel header — Telegram style */}
      <header className="sticky top-0 z-40 border-b border-border/40 backdrop-blur-xl bg-background/85">
        <div className="mx-auto max-w-2xl px-3 sm:px-4 h-16 flex items-center gap-3">
          <div className="relative shrink-0">
            <div className="h-11 w-11 rounded-full gold-bg grid place-items-center font-display text-lg font-bold text-primary-foreground shadow-[0_0_20px_-4px_var(--gold)]">
              {meta.hue}
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-green-500 border-2 border-background" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <h1 className="font-semibold text-[15px] truncate">{meta.name}</h1>
              <BadgeCheck className="h-4 w-4 text-gold shrink-0 fill-gold/20" />
            </div>
            <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
              <span>{meta.subs} subscribers</span>
              <span className="h-1 w-1 rounded-full bg-muted-foreground/50" />
              <span className="text-green-500/90">online</span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {isVip ? (
              <span className="rounded-full gold-bg px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider inline-flex items-center gap-1"><Crown className="h-3 w-3" />VIP</span>
            ) : (
              <span className="rounded-full glass px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Free</span>
            )}
            <Link to="/admin" className="p-2 rounded-full hover:bg-muted/40" title="Admin"><Settings2 className="h-4 w-4 text-muted-foreground" /></Link>
            <button onClick={signOut} className="p-2 rounded-full hover:bg-muted/40" title="Sign out"><LogOut className="h-4 w-4 text-muted-foreground" /></button>
          </div>
        </div>

        {/* Pinned bar */}
        {nextRelease && (
          <div className="border-t border-border/30 bg-background/60">
            <div className="mx-auto max-w-2xl px-3 sm:px-4 py-2 flex items-center gap-3">
              <Pin className="h-3.5 w-3.5 text-gold rotate-45 shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="text-[10px] uppercase tracking-widest text-gold">Pinned · Next drop</div>
                <div className="text-xs text-muted-foreground truncate">
                  Every {settingsQ.data?.release_interval_minutes ?? 60} min · Channel {profile.channel}
                </div>
              </div>
              <div className="text-xs font-mono tabular-nums text-gold shrink-0">
                <Countdown target={nextRelease} onZero={() => predictionsQ.refetch()} compact />
              </div>
              <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
            </div>
          </div>
        )}
      </header>

      {/* Feed */}
      <main className="mx-auto max-w-2xl px-3 sm:px-4 py-4 pb-32 space-y-2">
        {/* Welcome system message */}
        <SystemMessage>
          You joined <b className="text-gold">{meta.name}</b>. Broadcasts are automatic.
          {!isVip && <> You have <b className="text-gold">{freeRemaining} free {freeRemaining === 1 ? "pick" : "picks"}</b> remaining.</>}
        </SystemMessage>

        {feed.length === 0 && (
          <div className="py-16 text-center">
            <Volume2 className="h-8 w-8 text-muted-foreground/40 mx-auto" />
            <p className="mt-3 text-sm text-muted-foreground">No broadcasts yet. Watch the pinned countdown.</p>
          </div>
        )}

        {feed.map((item, idx) => {
          const prev = feed[idx - 1];
          const showDate = !prev || !sameDay(new Date(prev.ts), new Date(item.ts));
          return (
            <div key={item.kind === "pick" ? item.pick.id : item.kind === "announcement" ? item.announcement.id : `l${item.i}`}>
              {showDate && <DateChip d={new Date(item.ts)} />}
              {item.kind === "pick" && <PickBubble p={item.pick} channelLetter={profile.channel} />}
              {item.kind === "announcement" && <AnnouncementBubble a={item.announcement} channelLetter={profile.channel} />}
              {item.kind === "locked" && <LockedBubble idx={item.i} channelLetter={profile.channel} />}
            </div>
          );
        })}

        {/* VIP CTA as a channel post */}
        {!isVip && (
          <div id="upgrade">
            <DateChip d={new Date()} label="Sponsored" />
            <MessageShell channelLetter={profile.channel}>
              <div className="flex items-center gap-2 mb-2">
                <Crown className="h-4 w-4 text-gold" />
                <span className="text-[11px] font-semibold uppercase tracking-widest text-gold">VIP Upgrade</span>
              </div>
              <div className="font-display text-2xl leading-tight">Unlock every fixed match.</div>
              <p className="mt-1.5 text-sm text-muted-foreground">
                VIP members receive every broadcast on this channel plus WhatsApp delivery.
              </p>
              <a
                href="https://wa.me/10000000000?text=I%20want%20to%20upgrade%20to%20VIP"
                target="_blank" rel="noreferrer"
                className="mt-3 inline-flex items-center gap-2 rounded-full gold-bg px-4 py-2 text-xs font-semibold"
              >
                <Crown className="h-3.5 w-3.5" /> Contact to go VIP
              </a>
              <MessageMeta views={randViews(item_key("cta"))} time={new Date()} />
            </MessageShell>
          </div>
        )}
      </main>
    </div>
  );
}

/* ---------- primitives ---------- */

function MessageShell({ children, channelLetter, tone = "default" }: {
  children: React.ReactNode; channelLetter: "A" | "B"; tone?: "default" | "fixed" | "locked" | "broadcast";
}) {
  const toneClass =
    tone === "fixed" ? "card-fixed" :
    tone === "locked" ? "card-noir opacity-95" :
    tone === "broadcast" ? "card-noir border-l-2 border-gold/70" :
    "card-noir";
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}
      className="flex items-end gap-2"
    >
      <div className="h-8 w-8 shrink-0 rounded-full gold-bg grid place-items-center text-[11px] font-bold text-primary-foreground self-start mt-1">
        {channelLetter}
      </div>
      <div className={`relative ${toneClass} rounded-2xl rounded-bl-md px-4 py-3 max-w-[85%] sm:max-w-[78%]`}>
        {children}
      </div>
    </motion.div>
  );
}

function MessageMeta({ views, time, pinned }: { views: string; time: Date; pinned?: boolean }) {
  return (
    <div className="mt-2 flex items-center justify-end gap-1.5 text-[10px] text-muted-foreground">
      {pinned && <Pin className="h-3 w-3 text-gold rotate-45" />}
      <Eye className="h-3 w-3" />
      <span>{views}</span>
      <span className="ml-1">{time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
    </div>
  );
}

function PickBubble({ p, channelLetter }: { p: Prediction; channelLetter: "A" | "B" }) {
  const isGuaranteed = p.confidence >= 5;
  return (
    <MessageShell channelLetter={channelLetter} tone="fixed">
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="rounded-md gold-bg px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest">🔒 Fixed</span>
        <span className="text-[10px] uppercase tracking-widest text-muted-foreground">{p.league}</span>
        {p.tier === "free" && <span className="rounded-md glass px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest text-gold">Free</span>}
        {isGuaranteed && <span className="rounded-md glass px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest text-gold inline-flex items-center gap-0.5"><Flame className="h-2.5 w-2.5" />Lock</span>}
      </div>
      <div className="mt-2 font-display text-xl sm:text-2xl leading-tight">
        {p.home_team} <span className="text-muted-foreground text-base">vs</span> {p.away_team}
      </div>
      <div className="mt-0.5 text-[11px] text-muted-foreground flex items-center gap-1.5">
        <Timer className="h-3 w-3" /> Kick-off {new Date(p.kickoff_at).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
      </div>

      <div className="mt-3 rounded-xl bg-background/40 border border-gold/25 px-3 py-2">
        <div className="text-[9px] uppercase tracking-widest text-gold">Prediction</div>
        <div className="font-display text-xl gold-text leading-tight">{p.prediction}</div>
        <div className="mt-1.5 flex items-center gap-3 text-[11px]">
          {p.odds != null && <span>Odds <b className="text-gold">{p.odds}</b></span>}
          <span className="inline-flex items-center gap-1">
            {Array.from({ length: 5 }).map((_, k) => (
              <span key={k} className={`h-1.5 w-1.5 rounded-full ${k < p.confidence ? "bg-gold" : "bg-muted"}`} />
            ))}
          </span>
        </div>
      </div>

      <MessageMeta views={randViews(p.id)} time={new Date(p.release_at)} pinned={isGuaranteed} />
    </MessageShell>
  );
}

function AnnouncementBubble({ a, channelLetter }: { a: Announcement; channelLetter: "A" | "B" }) {
  return (
    <MessageShell channelLetter={channelLetter} tone="broadcast">
      <div className="flex items-center gap-1.5">
        <Bell className="h-3.5 w-3.5 text-gold" />
        <span className="text-[10px] uppercase tracking-widest text-gold font-semibold">Broadcast</span>
      </div>
      <h3 className="mt-1 font-display text-lg leading-tight">{a.title}</h3>
      <p className="mt-1 text-sm text-foreground/85 whitespace-pre-wrap">{a.body}</p>
      <MessageMeta views={randViews(a.id)} time={new Date(a.created_at)} />
    </MessageShell>
  );
}

function LockedBubble({ idx, channelLetter }: { idx: number; channelLetter: "A" | "B" }) {
  return (
    <MessageShell channelLetter={channelLetter} tone="locked">
      <div className="flex items-center gap-1.5">
        <Lock className="h-3.5 w-3.5 text-gold" />
        <span className="text-[10px] uppercase tracking-widest text-gold font-semibold">VIP only</span>
        <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Premier League</span>
      </div>
      <div className="mt-2 font-display text-xl blur-[6px] select-none">██████ vs ██████</div>
      <div className="text-[11px] text-muted-foreground blur-sm select-none">Kick-off hidden</div>
      <div className="mt-3 rounded-xl bg-background/40 border border-border/60 px-3 py-2 blur-[5px] select-none">
        <div className="text-[9px] uppercase tracking-widest text-gold">Prediction</div>
        <div className="font-display text-xl">████ █ ██</div>
      </div>
      <a href="#upgrade" className="mt-3 inline-flex items-center gap-1.5 rounded-full gold-bg px-3.5 py-1.5 text-[11px] font-semibold">
        <Crown className="h-3 w-3" /> Unlock this broadcast
      </a>
      <MessageMeta views={String(2100 + idx * 137)} time={new Date()} />
    </MessageShell>
  );
}

function SystemMessage({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex justify-center py-2">
      <div className="rounded-full glass px-3.5 py-1.5 text-[11px] text-muted-foreground max-w-[90%] text-center">
        {children}
      </div>
    </div>
  );
}

function DateChip({ d, label }: { d: Date; label?: string }) {
  const text = label ?? formatDay(d);
  return (
    <div className="flex justify-center py-3 sticky top-[64px] z-10 pointer-events-none">
      <div className="rounded-full bg-background/85 backdrop-blur-md border border-gold/25 px-3 py-1 text-[10px] uppercase tracking-widest text-gold shadow-lg">
        {text}
      </div>
    </div>
  );
}

/* ---------- helpers ---------- */

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function formatDay(d: Date) {
  const today = new Date();
  const y = new Date(); y.setDate(today.getDate() - 1);
  if (sameDay(d, today)) return "Today";
  if (sameDay(d, y)) return "Yesterday";
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}
function randViews(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  const n = Math.abs(h) % 8000 + 1200;
  return n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(n);
}
function item_key(s: string) { return s; }

function FeedSkeleton() {
  return (
    <div className="mx-auto max-w-2xl px-3 py-6 space-y-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex items-end gap-2">
          <div className="h-8 w-8 rounded-full bg-muted/40 shrink-0" />
          <div className="card-noir rounded-2xl rounded-bl-md h-28 w-3/4 shimmer" />
        </div>
      ))}
    </div>
  );
}

/* Trophy import kept for tree-shake friendliness; ensures no dead-import warnings */
export const _icons_used = { Trophy };
