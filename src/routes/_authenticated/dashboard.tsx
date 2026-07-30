import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BadgeCheck, Bell, LogOut, Crown, Eye, Pin,
  Settings2, Timer, ChevronDown, ArrowDown, CalendarClock,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Countdown } from "@/components/Countdown";
import { toast } from "sonner";
import { getOrCreateMyProfile } from "@/lib/profile.functions";
import { amIAdmin, markTourCompleted, updateLastSeen } from "@/lib/channel.functions";
import { AdminComposer } from "@/components/channel/AdminComposer";
import { RequestCenterProvider, useRequestCenter } from "@/components/requests/RequestCenter";


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
    // ascending (oldest at top, newest at bottom — like Telegram)
    return [...picks, ...anns].sort((a, b) => a.ts - b.ts);
  }, [predictionsQ.data, announcementsQ.data]);
  

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

  const meta = CHANNEL_META;
  const freeRemaining = Math.max(0, 2 - (profile.free_picks_claimed ?? 0));
  const nextRelease = settingsQ.data?.next_release_at;
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
      <header className="sticky top-0 z-40 border-b border-gold/15 backdrop-blur-2xl bg-background/80">
        <div
          className="absolute inset-0 pointer-events-none opacity-40"
          style={{
            background:
              "linear-gradient(180deg, oklch(0.82 0.14 85 / 4%), transparent 60%)",
          }}
        />
        <div className="relative mx-auto max-w-2xl px-3 sm:px-4 h-16 flex items-center gap-3">
          <div className="relative shrink-0">
            <div className="absolute inset-0 rounded-full gold-bg blur-md opacity-60" />
            <div className="relative h-11 w-11 rounded-full grid place-items-center font-display text-sm font-bold tracking-tight text-primary-foreground shadow-[0_0_24px_-4px_var(--gold)] gold-bg ring-2 ring-background">
              {meta.mark}
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-green-500 border-2 border-background" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <h1 className="font-display text-[17px] tracking-tight truncate">{meta.name}</h1>
              <BadgeCheck className="h-4 w-4 text-gold shrink-0 fill-gold/20" />
            </div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-1.5">
              <span>{meta.subs} subscribers</span>
              <span className="h-1 w-1 rounded-full bg-gold/50" />
              <span className="text-gold/80">Private · Fixed picks</span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {isVip ? (
              <span className="rounded-full gold-bg px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider inline-flex items-center gap-1"><Crown className="h-3 w-3" />VIP</span>
            ) : (
              <span className="rounded-full glass px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Free</span>
            )}
            {isAdmin && (
              <Link to="/admin" className="p-2 rounded-full hover:bg-gold/10" title="Admin"><Settings2 className="h-4 w-4 text-gold" /></Link>
            )}
            <button onClick={signOut} className="p-2 rounded-full hover:bg-muted/40" title="Sign out"><LogOut className="h-4 w-4 text-muted-foreground" /></button>
          </div>
        </div>

        {/* Pinned bar (admin pinned message OR countdown fallback) */}
        {pinnedMsg ? (
          <div className="border-t border-gold/20 bg-gradient-to-r from-gold/5 via-transparent to-gold/5">
            <div className="mx-auto max-w-2xl px-3 sm:px-4 py-2 flex items-center gap-3">
              <Pin className="h-3.5 w-3.5 text-gold rotate-45 shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="text-[10px] uppercase tracking-widest text-gold">Pinned</div>
                <div className="text-xs text-foreground/90 truncate">{pinnedMsg.title || pinnedMsg.body}</div>
              </div>
              {nextRelease && (
                <div className="text-[11px] font-mono tabular-nums text-gold/80 shrink-0">
                  <Countdown target={nextRelease} onZero={() => predictionsQ.refetch()} compact />
                </div>
              )}
            </div>
          </div>
        ) : nextRelease ? (
          <div className="border-t border-gold/20 bg-gradient-to-r from-gold/5 via-transparent to-gold/5">
            <div className="mx-auto max-w-2xl px-3 sm:px-4 py-2 flex items-center gap-3">
              <Pin className="h-3.5 w-3.5 text-gold rotate-45 shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="text-[10px] uppercase tracking-widest text-gold">Pinned · Next drop</div>
                <div className="text-xs text-muted-foreground truncate">
                  Every {settingsQ.data?.release_interval_minutes ?? 60} min · Private feed
                </div>
              </div>
              <div className="text-xs font-mono tabular-nums text-gold shrink-0">
                <Countdown target={nextRelease} onZero={() => predictionsQ.refetch()} compact />
              </div>
              <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
            </div>
          </div>
        ) : null}
      </header>

      {/* Feed */}
      <main className="mx-auto max-w-2xl px-3 sm:px-4 py-4 pb-40 space-y-2">
        {/* Welcome system message */}
        <SystemMessage>
          You joined <b className="text-gold">{meta.name}</b>. Broadcasts are automatic.
          {!isVip && <> You have <b className="text-gold">{freeRemaining} free {freeRemaining === 1 ? "pick" : "picks"}</b> remaining.</>}
        </SystemMessage>

        {/* Next match countdown — premium hero card */}
        {nextMatch && <NextMatchCard p={nextMatch} isVip={isVip} onZero={() => predictionsQ.refetch()} />}

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
                {item.kind === "pick" && <PickBubble p={item.pick} channelLetter={profile.channel} unseen={unseen} />}
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
    tone === "locked" ? "card-noir opacity-95" :
    tone === "broadcast" ? "card-noir border-l-2 border-gold/70" :
    "card-noir";
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}
      className="flex items-end gap-2"
    >
      <div className="h-8 w-8 shrink-0 rounded-full gold-bg grid place-items-center text-[11px] font-bold text-primary-foreground self-start mt-1">
        {CHANNEL_META.mark}
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

function NewBadge() {
  return (
    <span className="rounded-md bg-gold/15 border border-gold/40 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest text-gold">
      New
    </span>
  );
}

function UnreadDivider({ count }: { count: number }) {
  return (
    <div className="relative flex items-center gap-3 py-4">
      <span className="h-px flex-1 bg-gradient-to-r from-transparent to-gold/50" />
      <span className="rounded-full border border-gold/40 bg-gold/10 px-3 py-1 text-[10px] uppercase tracking-[0.25em] text-gold whitespace-nowrap">
        {count} unread {count === 1 ? "message" : "messages"}
      </span>
      <span className="h-px flex-1 bg-gradient-to-l from-transparent to-gold/50" />
    </div>
  );
}

function NextMatchCard({ p, isVip, onZero }: { p: Prediction; isVip: boolean; onZero: () => void }) {
  const locked = !isVip && p.tier === "vip";
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-3xl card-noir border border-gold/25 p-5 my-3"
    >
      <div
        className="absolute inset-0 pointer-events-none opacity-70"
        style={{
          background:
            "radial-gradient(ellipse 70% 60% at 50% -10%, oklch(0.82 0.14 85 / 12%), transparent 65%)",
        }}
      />
      <div className="relative">
        <div className="flex items-center justify-center gap-2">
          <CalendarClock className="h-3.5 w-3.5 text-gold" />
          <span className="text-[10px] uppercase tracking-[0.3em] text-gold">Next match kicks off in</span>
        </div>

        <div className="mt-4">
          <Countdown target={p.kickoff_at} onZero={onZero} />
        </div>

        <div className="mt-5 text-center">
          <div className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">{p.league}</div>
          <div className={`mt-1 font-display text-2xl leading-tight ${locked ? "blur-[6px] select-none" : ""}`}>
            {locked ? "██████ vs ██████" : <>{p.home_team} <span className="text-muted-foreground text-lg">vs</span> {p.away_team}</>}
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground">
            {new Date(p.kickoff_at).toLocaleString([], { weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
          </div>
          {locked && (
            <RequestCta
              kind="next_game"
              subject="Buy the next game"
              draft={`I want to buy the next game (kickoff ${new Date(p.kickoff_at).toLocaleString()}).`}
              label="Request this match"
              className="mt-4 inline-flex items-center gap-1.5 rounded-full gold-bg px-4 py-2 text-[11px] font-semibold"
            />
          )}
        </div>
      </div>
    </motion.div>
  );
}

function PickBubble({ p, channelLetter, unseen }: { p: Prediction; channelLetter: "A" | "B"; unseen?: boolean }) {
  const isGuaranteed = p.confidence >= 5;
  return (
    <MessageShell channelLetter={channelLetter} tone="fixed">
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="rounded-md gold-bg px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest">🔒 Fixed</span>
        <span className="text-[10px] uppercase tracking-widest text-muted-foreground">{p.league}</span>
        {unseen && <NewBadge />}
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

function AnnouncementBubble({ a, channelLetter, unseen }: { a: Announcement; channelLetter: "A" | "B"; unseen?: boolean }) {
  return (
    <MessageShell channelLetter={channelLetter} tone="broadcast">
      <div className="flex items-center gap-1.5">
        <Bell className="h-3.5 w-3.5 text-gold" />
        <span className="text-[10px] uppercase tracking-widest text-gold font-semibold">Broadcast</span>
        {unseen && <NewBadge />}
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
      <RequestCta
        kind="next_game"
        subject="Buy the next game"
        draft="I want to buy access to this locked broadcast."
        label="Request this broadcast"
        className="mt-3 inline-flex items-center gap-1.5 rounded-full gold-bg px-3.5 py-1.5 text-[11px] font-semibold"
      />
      <MessageMeta views={String(2100 + idx * 137)} time={new Date()} />
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
