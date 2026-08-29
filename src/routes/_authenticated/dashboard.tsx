import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BadgeCheck, Bell, LogOut, Crown, Eye, Pin,
  Settings2, Timer, ArrowDown, CalendarClock, LockKeyhole,
  Sparkles, Trophy, Radio,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Countdown } from "@/components/Countdown";
import { toast } from "sonner";
import { getOrCreateMyProfile } from "@/lib/profile.functions";
import { amIAdmin, getChannelPicks, markTourCompleted, updateLastSeen } from "@/lib/channel.functions";
import { AdminComposer } from "@/components/channel/AdminComposer";
import { RequestCenterProvider, useRequestCenter } from "@/components/requests/RequestCenter";
import { SPORT_LABEL, sportLabel, type Sport } from "@/lib/sports";
import { ShareToReveal, useShareUnlocked } from "@/components/ShareToReveal";


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
  last_seen_at?: string | null;
};

type Prediction = {
  id: string; channel: "A" | "B"; sport?: Sport | string | null; match_name: string; league: string;
  home_team: string; away_team: string; kickoff_at: string; prediction: string;
  odds: number | null; confidence: number; published: boolean; release_at: string;
  tier: "free" | "vip";
  locked?: boolean;
};
type ChannelSettings = { channel: "A" | "B"; next_release_at: string; release_interval_minutes: number };
type Announcement = {
  id: string; target: "all" | "A" | "B"; title: string; body: string; created_at: string;
  channel?: "A" | "B" | null; pinned?: boolean; image_url?: string | null;
};

const CHANNEL_META = {
  name: "Aurum Fixed · VIP Signals",
  handle: "@aurumfixed",
  subs: "12,847",
  mark: "AF",
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

  const fetchPicks = useServerFn(getChannelPicks);
  const predictionsQ = useQuery({
    queryKey: ["predictions", channel],
    enabled: !!channel,
    queryFn: async (): Promise<Prediction[]> => ((await fetchPicks()) as Prediction[]) ?? [],
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
  const [sportFilter, setSportFilter] = useState<Sport | "all">("all");

  const availableSports = useMemo(() => {
    const set = new Set<string>();
    for (const p of predictionsQ.data ?? []) set.add((p.sport ?? "football") as string);
    return Array.from(set);
  }, [predictionsQ.data]);

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
    const picks = (predictionsQ.data ?? [])
      // Everyone sees every published pick in their channel; VIP ones arrive locked.
      .filter((p) => isAdmin || p.published)
      .filter((p) => sportFilter === "all" || (p.sport ?? "football") === sportFilter)
      .map((p) => ({ kind: "pick" as const, ts: new Date(p.release_at).getTime(), pick: p }));
    const anns = (announcementsQ.data ?? []).map((a) => ({
      kind: "announcement" as const, ts: new Date(a.created_at).getTime(), announcement: a,
    }));
    // ascending (oldest at top, newest at bottom — like Telegram)
    return [...picks, ...anns].sort((a, b) => a.ts - b.ts);
  }, [predictionsQ.data, announcementsQ.data, isAdmin, sportFilter]);
  

  /* ---------- seen / unseen tracking ---------- */
  const pushSeen = useServerFn(updateLastSeen);
  const [baseline, setBaseline] = useState<number | null>(null);
  const persistedRef = useRef<number>(0);
  const unreadAnchorRef = useRef<HTMLDivElement | null>(null);
  const [atBottom, setAtBottom] = useState(true);

  useEffect(() => {
    if (!profile || baseline !== null) return;
    const raw = profile.last_seen_at ?? profile.created_at;
    const ts = new Date(raw).getTime();
    setBaseline(Number.isFinite(ts) ? ts : 0);
    persistedRef.current = Number.isFinite(ts) ? ts : 0;
  }, [profile, baseline]);

  const newestTs = feed.length ? feed[feed.length - 1].ts : 0;
  const unreadCount = baseline === null ? 0 : feed.filter((i) => i.ts > baseline).length;
  const firstUnreadTs = baseline === null ? null : feed.find((i) => i.ts > baseline)?.ts ?? null;

  const markSeen = useCallback(() => {
    if (!newestTs || newestTs <= persistedRef.current) return;
    persistedRef.current = newestTs;
    pushSeen({ data: { seen_at: new Date(newestTs).toISOString() } }).catch(() => {});
  }, [newestTs, pushSeen]);

  useEffect(() => {
    const onScroll = () => {
      const near =
        window.innerHeight + window.scrollY >= document.body.scrollHeight - 160;
      setAtBottom(near);
      if (near) markSeen();
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [markSeen]);

  // Resume: jump to the first unread message once, after the feed renders.
  const resumedRef = useRef(false);
  useEffect(() => {
    if (resumedRef.current || baseline === null || firstUnreadTs === null) return;
    const el = unreadAnchorRef.current;
    if (!el) return;
    resumedRef.current = true;
    requestAnimationFrame(() => el.scrollIntoView({ behavior: "smooth", block: "start" }));
  }, [baseline, firstUnreadTs, feed.length]);



  /* ---------- next match countdown ---------- */
  const nextMatch = useMemo(() => {
    const now = Date.now();
    return (predictionsQ.data ?? [])
      .filter((p) => p.published && new Date(p.kickoff_at).getTime() > now)
      .sort((a, b) => new Date(a.kickoff_at).getTime() - new Date(b.kickoff_at).getTime())[0];
  }, [predictionsQ.data]);

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

  const meta = CHANNEL_META;
  const freeRemaining = Math.max(0, 2 - (profile.free_picks_claimed ?? 0));
  
  const pinnedMsg = (announcementsQ.data ?? []).filter((a) => a.pinned).slice(-1)[0];
  const showTour = !profile.tour_completed && !!announcementsQ.data;

  return (
    <RequestCenterProvider>
    <div className="min-h-screen relative">
      {/* Ambient aurora backdrop */}
      <div
        className="fixed inset-0 -z-10 pointer-events-none opacity-70"
        style={{
          background:
            "radial-gradient(ellipse 60% 40% at 20% 0%, oklch(0.82 0.14 85 / 8%), transparent 60%), radial-gradient(ellipse 50% 30% at 80% 10%, oklch(0.62 0.13 75 / 6%), transparent 60%)",
        }}
      />

      {/* Channel header — premium Telegram style */}
      <header className="sticky top-0 z-40 border-b border-gold/12 backdrop-blur-2xl bg-background/85">
        <div className="relative mx-auto max-w-2xl px-3 sm:px-4 h-14 flex items-center gap-3">
          <div className="relative shrink-0">
            <div className="channel-avatar relative h-10 w-10 rounded-full grid place-items-center font-display text-[13px] font-semibold tracking-tight text-background border border-gold/60">
              <span className="relative z-10">{meta.mark}</span>
            </div>
            <span className="absolute -right-0.5 -bottom-0.5 h-2.5 w-2.5 rounded-full border-2 border-background bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,.75)]" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <h1 className="font-display text-[16px] tracking-tight truncate">{meta.name}</h1>
              <BadgeCheck className="h-3.5 w-3.5 text-gold/60 shrink-0" />
            </div>
            <div className="text-[10px] tracking-[0.16em] uppercase text-muted-foreground/80 truncate">
              {meta.subs} subscribers · Private channel
            </div>
          </div>
          <div className="flex items-center gap-1">
            <span className="hidden sm:inline-flex items-center gap-1 rounded-full border border-emerald-400/20 bg-emerald-400/[0.06] px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.16em] text-emerald-300/80">
              <Radio className="h-2.5 w-2.5" /> Live
            </span>
            {isVip ? (
              <span className="rounded-full border border-gold/45 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.2em] text-gold inline-flex items-center gap-1"><Crown className="h-2.5 w-2.5" />VIP</span>
            ) : (
              <span className="rounded-full border border-border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Free</span>
            )}
            {isAdmin && (
              <Link to="/admin" className="p-2 rounded-full hover:bg-gold/10" title="Admin"><Settings2 className="h-4 w-4 text-gold/80" /></Link>
            )}
            <button onClick={signOut} className="p-2 rounded-full hover:bg-muted/40" title="Sign out"><LogOut className="h-4 w-4 text-muted-foreground" /></button>
          </div>
        </div>

        {/* Pinned bar */}
        {pinnedMsg ? (
          <div className="border-t border-gold/12">
            <div className="mx-auto max-w-2xl px-3 sm:px-4 py-1.5 flex items-center gap-3">
              <Pin className="h-3 w-3 text-gold/70 rotate-45 shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="text-[9px] uppercase tracking-[0.3em] text-gold/70">Pinned</div>
                <div className="text-xs text-foreground/80 truncate">{pinnedMsg.title || pinnedMsg.body}</div>
              </div>
            </div>
          </div>
        ) : null}
      </header>

      {/* Feed */}
      <main className="mx-auto max-w-2xl px-3 sm:px-4 py-5 pb-40 space-y-3">
        {/* Welcome system message */}
        <SystemMessage>
          You joined <b className="text-gold">{meta.name}</b>. Broadcasts are automatic.
          {!isVip && <> You have <b className="text-gold">{freeRemaining} free {freeRemaining === 1 ? "pick" : "picks"}</b> remaining.</>}
        </SystemMessage>

        {/* Next match countdown — premium hero card */}
        {nextMatch && <NextMatchCard p={nextMatch} isVip={isVip} onZero={() => predictionsQ.refetch()} />}

        {availableSports.length > 1 && (
          <div className="flex flex-wrap items-center gap-1.5">
            {(["all", ...availableSports] as const).map((sp) => (
              <button
                key={sp}
                onClick={() => setSportFilter(sp as Sport | "all")}
                className={`px-2.5 py-1 rounded-full text-[10px] uppercase tracking-widest font-semibold transition ${
                  sportFilter === sp ? "gold-bg text-primary-foreground" : "glass text-muted-foreground hover:text-foreground"
                }`}
              >
                {sp === "all" ? "All sports" : SPORT_LABEL[sp as Sport] ?? sp}
              </button>
            ))}
          </div>
        )}

        {feed.length === 0 && (
          <div className="py-20 text-center">
            <div className="mx-auto h-px w-16 bg-gold/25" />
            <p className="mt-5 font-display text-xl text-foreground/80">No broadcasts yet</p>
            <p className="mt-1 text-xs text-muted-foreground">The next drop appears here automatically.</p>
          </div>
        )}

        {feed.map((item, idx) => {
          const prev = feed[idx - 1];
          const showDate = !prev || !sameDay(new Date(prev.ts), new Date(item.ts));
          const isFirstUnread = firstUnreadTs !== null && item.ts === firstUnreadTs;
          const unseen = baseline !== null && item.ts > baseline;
          return (
            <div key={item.kind === "pick" ? item.pick.id : item.announcement.id} className="pt-1">
              {showDate && <DateChip d={new Date(item.ts)} />}
              {isFirstUnread && (
                <div ref={unreadAnchorRef} className="scroll-mt-32">
                  <UnreadDivider count={unreadCount} />
                </div>
              )}
              <div>
                {item.kind === "pick" && <PickBubble p={item.pick} channelLetter={profile.channel} unseen={unseen} isAdmin={isAdmin} isVip={isVip} />}
                {item.kind === "announcement" && <AnnouncementBubble a={item.announcement} channelLetter={profile.channel} unseen={unseen} />}
              </div>
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
              <RequestCta
                kind="upgrade"
                subject="VIP upgrade request"
                draft="I want to upgrade to VIP. Please tell me how to pay."
                label="Request VIP upgrade"
                className="mt-3 inline-flex items-center gap-2 rounded-full gold-bg px-4 py-2 text-xs font-semibold"
              />
              <MessageMeta views={randViews(item_key("cta"))} time={new Date()} />
            </MessageShell>
          </div>
        )}
      </main>

      {/* Jump to unread / latest */}
      <AnimatePresence>
        {unreadCount > 0 && !atBottom && (
          <motion.button
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            onClick={() => {
              const el = unreadAnchorRef.current;
              if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
              else window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
            }}
            className="fixed bottom-24 right-4 z-40 inline-flex items-center gap-2 rounded-full gold-bg px-4 py-2.5 text-xs font-semibold shadow-[0_10px_40px_-10px_var(--gold)]"
          >
            <ArrowDown className="h-3.5 w-3.5" />
            {unreadCount} unread
          </motion.button>
        )}
      </AnimatePresence>



      {/* Admin inline composer */}
      {isAdmin && <AdminComposer currentChannel={profile.channel} />}

      {/* Welcome tour */}
      {showTour && (
        <WelcomeTour
          channelLetter={profile.channel}
          onDone={async () => {
            try {
              await doMarkTour();
              qc.invalidateQueries({ queryKey: ["profile"] });
            } catch {
              /* noop */
            }
          }}
        />
      )}
    </div>
    </RequestCenterProvider>
  );
}

function WelcomeTour({ channelLetter, onDone }: { channelLetter: "A" | "B"; onDone: () => void }) {
  const [step, setStep] = useState(0);
  const steps = [
    {
      title: "Welcome to your private channel",
      body: "This is your private feed. New broadcasts appear here at the bottom, just like Telegram.",
    },
    {
      title: "Pinned countdown",
      body: "The pinned bar at the top shows when the next fixed pick drops. Watch it — that's when messages arrive.",
    },
    {
      title: "2 free picks unlocked",
      body: "Try any two picks free. Everything else stays behind a gold lock until you upgrade to VIP.",
    },
  ];
  const s = steps[step];
  const last = step === steps.length - 1;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 grid place-items-center px-4 bg-background/70 backdrop-blur-md"
      >
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          key={step}
          className="w-full max-w-sm glass-strong rounded-3xl p-7 text-center relative overflow-hidden"
        >
          <div className="absolute -top-16 -right-16 h-40 w-40 rounded-full gold-bg opacity-20 blur-3xl" />
          <div className="relative">
            <div className="text-[10px] uppercase tracking-[0.35em] text-gold">Tour · {step + 1} / {steps.length}</div>
            <h2 className="mt-3 font-display text-3xl">{s.title}</h2>
            <p className="mt-3 text-sm text-muted-foreground">{s.body}</p>

            <div className="mt-6 flex items-center gap-2">
              <button onClick={onDone} className="rounded-full glass px-4 py-2.5 text-xs">Skip</button>
              <button
                onClick={() => (last ? onDone() : setStep(step + 1))}
                className="flex-1 rounded-full gold-bg px-5 py-2.5 text-sm font-semibold"
              >
                {last ? "Enter channel" : "Next"}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

/* ---------- primitives ---------- */

function MessageShell({ children, channelLetter, tone = "default" }: {
  children: React.ReactNode; channelLetter: "A" | "B"; tone?: "default" | "fixed" | "locked" | "broadcast";
}) {
  const toneClass =
    tone === "fixed" ? "card-fixed" :
    tone === "broadcast" ? "card-noir border-l border-gold/50" :
    "card-noir";
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}
      className="flex items-end gap-2.5"
    >
      <div className="h-7 w-7 shrink-0 rounded-full grid place-items-center text-[10px] font-semibold tracking-tight text-gold border border-gold/30 bg-gold/[0.06] self-start mt-1">
        {CHANNEL_META.mark}
      </div>
      <div className={`relative ${toneClass} rounded-2xl rounded-bl-md px-4 py-4 sm:px-5 max-w-[88%] sm:max-w-[78%]`}>
        {children}
      </div>
    </motion.div>
  );
}

function MessageMeta({ views, time, pinned }: { views: string; time: Date; pinned?: boolean }) {
  return (
    <div className="mt-3 flex items-center justify-end gap-1.5 text-[10px] text-muted-foreground/70">
      {pinned && <Pin className="h-3 w-3 text-gold/70 rotate-45" />}
      <Eye className="h-3 w-3 opacity-60" />
      <span className="tabular-nums">{views}</span>
      <span className="ml-1 tabular-nums">{time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
    </div>
  );
}

function NewBadge() {
  return <span className="h-1.5 w-1.5 rounded-full bg-gold shadow-[0_0_8px_var(--gold)]" aria-label="New" />;
}

function UnreadDivider({ count }: { count: number }) {
  return (
    <div className="relative flex items-center gap-4 py-5">
      <span className="h-px flex-1 bg-gradient-to-r from-transparent to-gold/25" />
      <span className="text-[9px] uppercase tracking-[0.35em] text-gold/70 whitespace-nowrap">
        {count} unread
      </span>
      <span className="h-px flex-1 bg-gradient-to-l from-transparent to-gold/25" />
    </div>
  );
}

function NextMatchCard({ p, isVip, onZero }: { p: Prediction; isVip: boolean; onZero: () => void }) {
  const locked = p.locked ?? (!isVip && p.tier === "vip");
  
  // Free predictions hidden until 30 minutes before kickoff
  const now = Date.now();
  const kickoffTime = new Date(p.kickoff_at).getTime();
  const minutesUntilKickoff = (kickoffTime - now) / (1000 * 60);
  const { unlocked: shareUnlocked } = useShareUnlocked(p.id);
  const freePredictionHidden = p.tier === "free" && minutesUntilKickoff > 30 && !shareUnlocked;
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="next-match-card relative overflow-hidden rounded-[1.75rem] card-noir border border-gold/30 px-4 py-5 sm:px-6 sm:py-7 my-5"
    >
      <div
        className="absolute inset-0 pointer-events-none opacity-80"
        style={{
          background:
            "radial-gradient(ellipse 90% 65% at 50% -20%, oklch(0.82 0.14 85 / 16%), transparent 68%), radial-gradient(circle at 0% 100%, oklch(0.62 0.13 75 / 10%), transparent 42%)",
        }}
      />
      <div className="absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-gold/80 to-transparent" />
      <div className="relative">
        <div className="flex items-center justify-between gap-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-gold/25 bg-gold/[0.06] px-3 py-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-gold shadow-[0_0_10px_var(--gold)] animate-pulse" />
            <span className="text-[9px] uppercase tracking-[0.3em] text-gold">Next game</span>
          </div>
          <span className="inline-flex items-center gap-1.5 text-[9px] uppercase tracking-[0.2em] text-muted-foreground">
            <CalendarClock className="h-3 w-3 text-gold/70" />
            {p.league}
          </span>
        </div>

        <div className="mt-5 text-center">
          <div className="text-[10px] uppercase tracking-[0.36em] text-muted-foreground/80">Starts in</div>
          <div className="mt-3">
            <Countdown target={p.kickoff_at} onZero={onZero} />
          </div>
        </div>

        <div className="mt-6 grid grid-cols-[1fr_auto_1fr] items-center gap-3 border-t border-gold/15 pt-5">
          <TeamBadge name={p.home_team} locked={locked} align="right" />
          <div className="flex flex-col items-center gap-1">
            <span className="font-display text-xl italic text-gold/70">VS</span>
            <span className="h-1 w-1 rounded-full bg-gold/50" />
          </div>
          <TeamBadge name={p.away_team} locked={locked} />
        </div>
        <div className="mt-4 flex items-center justify-center gap-2 text-[11px] text-muted-foreground">
          <Trophy className="h-3 w-3 text-gold/70" />
          {new Date(p.kickoff_at).toLocaleString([], { weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
        </div>
        <div className="mt-4 flex items-center justify-between rounded-xl border border-white/[0.06] bg-black/20 px-3 py-2.5">
          <span className="inline-flex items-center gap-2 text-[9px] uppercase tracking-[0.24em] text-muted-foreground">
            {locked ? (
              <>
                <LockKeyhole className="h-3 w-3 text-gold/70" />
                VIP pick locked
              </>
            ) : freePredictionHidden ? (
              <>
                <Timer className="h-3 w-3 text-gold/70" />
                Prediction locked
              </>
            ) : (
              <>
                <Sparkles className="h-3 w-3 text-gold/70" />
                Prepared for your channel
              </>
            )}
          </span>
          {p.odds != null && <span className="font-mono text-xs text-gold">ODDS {p.odds}</span>}
        </div>
        {freePredictionHidden && (
          <ShareToReveal
            id={p.id}
            message={`🔥 Next game on Aurum Fixed — ${p.home_team} vs ${p.away_team}. Join the channel:`}
            className="mt-4 text-center"
          />
        )}
        {locked && (
          <div className="text-center">
            <RequestCta
              kind="next_game"
              subject="Buy the next game"
              draft={`I want to buy the next game (kickoff ${new Date(p.kickoff_at).toLocaleString()}).`}
              label="Unlock this match"
              className="mt-4 inline-flex items-center gap-1.5 rounded-full gold-bg px-5 py-2.5 text-[11px] font-semibold shadow-[0_10px_28px_-12px_var(--gold)]"
            />
          </div>
        )}
      </div>
    </motion.div>
  );
}

function TeamBadge({ name, locked, align = "left" }: { name: string; locked: boolean; align?: "left" | "right" }) {
  const initials = name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
  return (
    <div className={`flex items-center gap-2.5 ${align === "right" ? "flex-row-reverse text-right" : ""}`}>
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-gold/25 bg-gradient-to-br from-gold/20 to-transparent font-display text-sm text-gold shadow-[inset_0_1px_0_rgba(255,255,255,.08)]">
        {locked ? "?" : initials}
      </div>
      <span className={`font-display text-lg leading-tight sm:text-xl ${locked ? "blur-[5px] select-none" : ""}`}>
        {locked ? "Hidden team" : name}
      </span>
    </div>
  );
}

function PickBubble({ p, channelLetter, unseen, isAdmin, isVip }: { p: Prediction; channelLetter: "A" | "B"; unseen?: boolean; isAdmin?: boolean; isVip: boolean }) {
  const locked = !!p.locked || (!isVip && p.tier === "vip");
  const isGuaranteed = !locked && p.confidence >= 5;
  const scheduled = new Date(p.release_at).getTime() > Date.now();
  
  // Free predictions hidden until 30 minutes before kickoff
  const now = Date.now();
  const kickoffTime = new Date(p.kickoff_at).getTime();
  const minutesUntilKickoff = (kickoffTime - now) / (1000 * 60);
  const { unlocked: shareUnlocked } = useShareUnlocked(p.id);
  const freePredictionHidden = p.tier === "free" && minutesUntilKickoff > 30 && !isAdmin && !shareUnlocked;
  return (
    <MessageShell channelLetter={channelLetter} tone="fixed">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[10px] uppercase tracking-[0.28em] text-gold">Fixed</span>
        <span className="h-1 w-1 rounded-full bg-gold/40" />
        <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{sportLabel(p.sport)} · {p.league}</span>
        {p.tier === "free" && (
          <span className="text-[10px] uppercase tracking-[0.2em] text-gold/80">· Free</span>
        )}
        {freePredictionHidden && (
          <span className="inline-flex items-center gap-1 rounded-full border border-gold/40 px-1.5 py-0.5 text-[9px] uppercase tracking-[0.2em] text-gold">
            <Timer className="h-2.5 w-2.5" /> Locked
          </span>
        )}
        {locked && (
          <span className="inline-flex items-center gap-1 rounded-full border border-gold/40 px-1.5 py-0.5 text-[9px] uppercase tracking-[0.2em] text-gold">
            <LockKeyhole className="h-2.5 w-2.5" /> VIP
          </span>
        )}
        {isAdmin && p.tier === "vip" && (
          <span className="rounded-full border border-gold/40 px-1.5 py-0.5 text-[9px] uppercase tracking-[0.2em] text-gold">VIP only</span>
        )}
        {isAdmin && (scheduled || !p.published) && (
          <span className="rounded-full border border-border px-1.5 py-0.5 text-[9px] uppercase tracking-[0.2em] text-muted-foreground">
            {p.published
              ? `Drops ${new Date(p.release_at).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}`
              : "Hidden"}
          </span>
        )}
        {unseen && <NewBadge />}
      </div>

      <div className="mt-2.5 font-display text-2xl sm:text-[28px] leading-[1.15]">
        <span className={locked ? "blur-[5px] select-none" : ""}>{locked ? "Hidden team" : p.home_team}</span>
        <span className="text-muted-foreground/70 text-base font-sans font-light"> vs </span>
        <span className={locked ? "blur-[5px] select-none" : ""}>{locked ? "Hidden team" : p.away_team}</span>
      </div>
      <div className="mt-1 text-[11px] text-muted-foreground/80 flex items-center gap-1.5">
        <Timer className="h-3 w-3 opacity-70" /> Starts {new Date(p.kickoff_at).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
      </div>

      {locked ? (
        <div className="mt-4 rounded-xl border border-gold/25 bg-background/50 px-4 py-3 text-center">
          <div className="text-[9px] uppercase tracking-[0.3em] text-gold/70">Prediction</div>
          <div className="mt-1 font-display text-2xl gold-text leading-tight blur-[6px] select-none">Hidden tip</div>
          <div className="mt-2.5 inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <LockKeyhole className="h-3 w-3 text-gold/70" /> VIP pick locked — upgrade to unlock
          </div>
        </div>
      ) : freePredictionHidden ? (
        <div className="mt-4 rounded-xl border border-gold/25 bg-background/50 px-4 py-3 text-center">
          <div className="text-[9px] uppercase tracking-[0.3em] text-gold/70">Prediction</div>
          <div className="mt-1 font-display text-2xl gold-text leading-tight blur-[6px] select-none">Coming soon</div>
          <div className="mt-2.5 inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Timer className="h-3 w-3 text-gold/70" /> Reveals 30 min before kickoff
          </div>
          <ShareToReveal
            id={p.id}
            message={`🔥 ${p.home_team} vs ${p.away_team} — my fixed pick drops on Aurum Fixed. Join the channel:`}
            className="mt-4 border-t border-gold/15 pt-3"
          />
        </div>
      ) : (
        <div className="mt-4 rounded-xl border border-gold/20 bg-background/50 px-4 py-3">
          <div className="text-[9px] uppercase tracking-[0.3em] text-gold/70">Prediction</div>
          <div className="mt-1 font-display text-2xl gold-text leading-tight">{p.prediction}</div>
          <div className="mt-2.5 flex items-center justify-between text-[11px]">
            <span className="text-muted-foreground">
              {p.odds != null ? <>Odds <b className="text-gold font-semibold tabular-nums">{p.odds}</b></> : <>&nbsp;</>}
            </span>
            <span className="inline-flex items-center gap-1">
              {Array.from({ length: 5 }).map((_, k) => (
                <span key={k} className={`h-1 w-1 rounded-full ${k < p.confidence ? "bg-gold" : "bg-muted"}`} />
              ))}
            </span>
          </div>
        </div>
      )}

      <MessageMeta views={randViews(p.id)} time={new Date(p.release_at)} pinned={isGuaranteed} />
    </MessageShell>
  );
}

function AnnouncementBubble({ a, channelLetter, unseen }: { a: Announcement; channelLetter: "A" | "B"; unseen?: boolean }) {
  return (
    <MessageShell channelLetter={channelLetter} tone="broadcast">
      <div className="flex items-center gap-2">
        <Bell className="h-3 w-3 text-gold/70" />
        <span className="text-[10px] uppercase tracking-[0.28em] text-gold/80">Broadcast</span>
        {unseen && <NewBadge />}
      </div>

      <h3 className="mt-2 font-display text-xl leading-tight">{a.title}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-foreground/80 whitespace-pre-wrap">{a.body}</p>
      <MessageMeta views={randViews(a.id)} time={new Date(a.created_at)} />

    </MessageShell>
  );
}


function RequestCta({
  kind, subject, draft, label, className,
}: {
  kind: "upgrade" | "next_game" | "general";
  subject: string;
  draft?: string;
  label: string;
  className?: string;
}) {
  const { open } = useRequestCenter();
  return (
    <button type="button" onClick={() => open({ kind, subject, draft })} className={className}>
      <Crown className="h-3.5 w-3.5" /> {label}
    </button>
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
    <div className="flex justify-center py-4 sticky top-[56px] z-10 pointer-events-none">
      <div className="rounded-full bg-background/90 backdrop-blur-md border border-gold/15 px-3 py-0.5 text-[9px] uppercase tracking-[0.3em] text-gold/70">
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
