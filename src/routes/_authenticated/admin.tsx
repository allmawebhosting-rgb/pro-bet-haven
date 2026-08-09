import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { SPORTS, SPORT_LABEL, participantLabels, sportLabel, type Sport } from "@/lib/sports";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, ListChecks, Users, Megaphone, Radio, Settings as SettingsIcon,
  Plus, X, Crown, Search, Inbox,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/Logo";
import {
  listUsersAdmin, updateUserAdmin, upsertPredictionAdmin, deletePredictionAdmin,
  updateChannelSettingsAdmin, createAnnouncementAdmin, grantAdminSelf, adminAnalytics,
  setMemberVipAdmin,
} from "@/lib/admin.functions";
import { RequestsTab } from "@/components/admin/RequestsTab";
import { updateSiteSettings } from "@/lib/site.functions";
import { useSiteSettings } from "@/lib/site-context";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [{ title: "Console — Aurum Fixed Admin" }, { name: "robots", content: "noindex" }],
  }),
  component: AdminPage,
});

type Tab = "overview" | "predictions" | "requests" | "users" | "announcements" | "channels" | "settings";

function AdminPage() {
  const qc = useQueryClient();
  const rolesQ = useQuery({
    queryKey: ["my-roles"],
    queryFn: async () => {
      const { data } = await supabase.from("user_roles").select("role");
      return (data ?? []).map((r) => r.role);
    },
  });
  const isAdmin = (rolesQ.data ?? []).includes("admin");

  const grantFn = useServerFn(grantAdminSelf);
  const [secret, setSecret] = useState("");
  const grantMut = useMutation({
    mutationFn: (s: string) => grantFn({ data: { secret: s } }),
    onSuccess: () => { toast.success("Admin access granted"); qc.invalidateQueries({ queryKey: ["my-roles"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  if (rolesQ.isLoading) return <div className="min-h-screen grid place-items-center"><div className="shimmer h-8 w-48 rounded" /></div>;

  if (!isAdmin) {
    return (
      <div className="min-h-screen grid place-items-center p-4">
        <div className="card-fixed rounded-3xl p-8 max-w-md w-full gold-ring">
          <p className="text-xs uppercase tracking-[0.25em] text-gold text-center">Admin bootstrap</p>
          <h1 className="mt-2 font-display text-3xl text-center">First-time setup</h1>
          <p className="mt-2 text-sm text-muted-foreground text-center">
            Enter the founder setup code to become the first admin.
          </p>
          <div className="mt-6 space-y-3">
            <input
              type="password" value={secret} onChange={(e) => setSecret(e.target.value)}
              className={inputCls}
              placeholder="Setup code"
            />
            <button
              onClick={() => grantMut.mutate(secret)}
              disabled={grantMut.isPending}
              className="w-full rounded-full gold-bg px-5 py-3 text-sm font-semibold"
            >
              {grantMut.isPending ? "Granting…" : "Become admin"}
            </button>
            <p className="text-center text-xs text-muted-foreground">Default code: <b className="text-foreground">allma2580</b></p>
            <Link to="/dashboard" className="block text-center text-xs text-muted-foreground hover:text-gold mt-3">← Back to dashboard</Link>
          </div>
        </div>
      </div>
    );
  }

  return <AdminShell />;
}

const navItems: { id: Tab; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "predictions", label: "Fixed matches", icon: ListChecks },
  { id: "requests", label: "Requests", icon: Inbox },
  { id: "users", label: "Members", icon: Users },
  { id: "announcements", label: "Broadcasts", icon: Megaphone },
  { id: "channels", label: "Channels", icon: Radio },
  { id: "settings", label: "Branding", icon: SettingsIcon },
];

function AdminShell() {
  const [tab, setTab] = useState<Tab>("overview");
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-border/40 backdrop-blur-xl bg-background/70">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 h-16 flex items-center justify-between">
          <Logo />
          <div className="flex items-center gap-2">
            <span className="rounded-full gold-bg px-3 py-1 text-[10px] font-bold uppercase tracking-widest">Console</span>
            <Link to="/dashboard" className="rounded-full glass px-3 py-1.5 text-xs hover:border-gold/40">Dashboard</Link>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8 grid gap-8 lg:grid-cols-[240px_1fr]">
        {/* Sidebar */}
        <aside>
          <nav className="card-noir rounded-2xl p-2 space-y-0.5 lg:sticky lg:top-24 flex lg:flex-col overflow-x-auto">
            {navItems.map((i) => (
              <button
                key={i.id}
                onClick={() => setTab(i.id)}
                className={`w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition whitespace-nowrap ${
                  tab === i.id ? "gold-bg text-primary-foreground font-semibold" : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                }`}
              >
                <i.icon className="h-4 w-4 shrink-0" /> <span>{i.label}</span>
              </button>
            ))}
          </nav>
        </aside>

        <main className="min-w-0">
          <AnimatePresence mode="wait">
            <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              {tab === "overview" && <OverviewTab />}
              {tab === "predictions" && <PredictionsTab />}
              {tab === "requests" && <RequestsTab />}
              {tab === "channels" && <ChannelsTab />}
              {tab === "users" && <UsersTab />}
              {tab === "announcements" && <AnnouncementsTab />}
              {tab === "settings" && <SettingsTab />}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}

/* --- Overview --- */
function OverviewTab() {
  const analyticsFn = useServerFn(adminAnalytics);
  const aq = useQuery({ queryKey: ["admin-analytics"], queryFn: () => analyticsFn() });
  const predsQ = useQuery({
    queryKey: ["admin-preds-count"],
    queryFn: async () => (await supabase.from("predictions").select("id, published, tier")).data ?? [],
  });
  const live = (predsQ.data ?? []).filter((p) => p.published).length;
  const vipCount = (predsQ.data ?? []).filter((p) => p.tier === "vip").length;

  const cards = [
    { l: "Total members", v: aq.data?.total ?? 0 },
    { l: "Channel A", v: aq.data?.chA ?? 0 },
    { l: "Channel B", v: aq.data?.chB ?? 0 },
    { l: "Last 7 days", v: aq.data?.last7 ?? 0 },
    { l: "Live picks", v: live },
    { l: "VIP-only picks", v: vipCount },
  ];

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs uppercase tracking-[0.25em] text-gold">Console</p>
        <h1 className="mt-1 font-display text-4xl sm:text-5xl">Operations at a glance.</h1>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((s) => (
          <div key={s.l} className="card-noir rounded-2xl p-5">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{s.l}</div>
            <div className="mt-2 font-display text-4xl gold-text tabular-nums">{s.v}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* --- Predictions --- */
function PredictionsTab() {
  const qc = useQueryClient();
  const listQ = useQuery({
    queryKey: ["admin-predictions"],
    queryFn: async () => {
      const { data } = await supabase.from("predictions").select("*").order("created_at", { ascending: false });
      return data ?? [];
    },
  });
  const upsertFn = useServerFn(upsertPredictionAdmin);
  const deleteFn = useServerFn(deletePredictionAdmin);
  const upsertMut = useMutation({
    mutationFn: (d: Parameters<typeof upsertFn>[0]["data"]) => upsertFn({ data: d }),
    onSuccess: () => { toast.success("Saved"); qc.invalidateQueries({ queryKey: ["admin-predictions"] }); setOpen(false); },
    onError: (e: Error) => toast.error(e.message),
  });
  const delMut = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => { toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["admin-predictions"] }); },
  });

  const [open, setOpen] = useState(false);
  const emptyForm = {
    id: undefined as string | undefined,
    channel: "A" as "A" | "B",
    sport: "football" as Sport,
    match_name: "",
    league: "",
    home_team: "",
    away_team: "",
    kickoff_at: "",
    prediction: "",
    odds: "",
    confidence: 5,
    published: true,
    release_at: "",
    tier: "vip" as "free" | "vip",
  };
  const [form, setForm] = useState(emptyForm);

  function openNew() { setForm(emptyForm); setOpen(true); }
  function openEdit(p: any) {
    setForm({
      id: p.id, channel: p.channel, sport: (p.sport ?? "football") as Sport, match_name: p.match_name, league: p.league,
      home_team: p.home_team, away_team: p.away_team,
      kickoff_at: new Date(p.kickoff_at).toISOString().slice(0, 16),
      prediction: p.prediction, odds: p.odds?.toString() ?? "",
      confidence: p.confidence, published: p.published,
      release_at: new Date(p.release_at).toISOString().slice(0, 16),
      tier: p.tier ?? "vip",
    });
    setOpen(true);
  }

  function submit() {
    if (!form.match_name || !form.home_team || !form.away_team || !form.kickoff_at) {
      toast.error("Fill in match details"); return;
    }
    upsertMut.mutate({
      id: form.id, channel: form.channel, sport: form.sport, match_name: form.match_name, league: form.league,
      home_team: form.home_team, away_team: form.away_team,
      kickoff_at: new Date(form.kickoff_at).toISOString(),
      prediction: form.prediction, odds: form.odds ? Number(form.odds) : null,
      confidence: form.confidence, published: form.published,
      release_at: form.release_at ? new Date(form.release_at).toISOString() : new Date().toISOString(),
      tier: form.tier,
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-display text-3xl">Fixed matches</h2>
          <p className="text-sm text-muted-foreground">Manage the slips shown in member feeds.</p>
        </div>
        <button onClick={openNew} className="rounded-full gold-bg px-4 py-2 text-sm font-semibold inline-flex items-center gap-1.5">
          <Plus className="h-4 w-4" /> New match
        </button>
      </div>

      <div className="card-noir rounded-2xl overflow-hidden">
        <div className="grid grid-cols-[80px_1fr_100px_100px_120px] gap-3 px-5 py-3 text-[10px] uppercase tracking-widest text-gold border-b border-border/60">
          <div>Ch</div><div>Match</div><div>Tier</div><div>Status</div><div className="text-right">Actions</div>
        </div>
        <div className="divide-y divide-border/40">
          {(listQ.data ?? []).length === 0 && (
            <div className="p-10 text-center text-sm text-muted-foreground">No matches yet — click "New match" to add one.</div>
          )}
          {(listQ.data ?? []).map((p: any) => (
            <div key={p.id} className="grid grid-cols-[80px_1fr_100px_100px_120px] gap-3 px-5 py-4 items-center hover:bg-white/[0.02] transition">
              <div className="text-xs text-gold font-semibold">Ch. {p.channel}</div>
              <div className="min-w-0">
                <div className="font-display text-base truncate">{p.home_team} vs {p.away_team}</div>
                <div className="text-[10px] text-muted-foreground truncate uppercase tracking-widest">{sportLabel(p.sport)} · {p.league} · {new Date(p.kickoff_at).toLocaleString()}</div>
              </div>
              <div>
                {p.tier === "free"
                  ? <span className="rounded-full glass px-2 py-0.5 text-[10px] uppercase tracking-widest text-gold">Free</span>
                  : <span className="rounded-full gold-bg px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest">VIP</span>}
              </div>
              <div>
                {p.published
                  ? <span className="text-xs text-emerald-400">● Live</span>
                  : <span className="text-xs text-muted-foreground">○ Hidden</span>}
              </div>
              <div className="flex justify-end gap-2">
                <button onClick={() => openEdit(p)} className="rounded-full glass px-3 py-1 text-[11px] hover:border-gold/40">Edit</button>
                <button onClick={() => delMut.mutate(p.id)} className="rounded-full px-3 py-1 text-[11px] text-destructive border border-destructive/40">Del</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Slide-over form */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-50 bg-background/70 backdrop-blur-sm"
            />
            <motion.div
              initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 250 }}
              className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md overflow-y-auto card-noir rounded-l-3xl p-6 border-l border-gold/30"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-display text-2xl">{form.id ? "Edit" : "New"} fixed match</h3>
                <button onClick={() => setOpen(false)} className="rounded-full glass p-2"><X className="h-4 w-4" /></button>
              </div>
              <div className="space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Channel">
                    <select value={form.channel} onChange={(e) => setForm({ ...form, channel: e.target.value as "A" | "B" })} className={inputCls}>
                      <option value="A">Channel A</option><option value="B">Channel B</option>
                    </select>
                  </Field>
                  <Field label="Tier">
                    <select value={form.tier} onChange={(e) => setForm({ ...form, tier: e.target.value as "free" | "vip" })} className={inputCls}>
                      <option value="free">Free trial</option><option value="vip">VIP only</option>
                    </select>
                  </Field>
                </div>
                <Field label="Sport">
                  <select value={form.sport} onChange={(e) => setForm({ ...form, sport: e.target.value as Sport })} className={inputCls}>
                    {SPORTS.map((sp) => <option key={sp} value={sp}>{SPORT_LABEL[sp]}</option>)}
                  </select>
                </Field>
                <Field label="Match name"><input className={inputCls} value={form.match_name} onChange={(e) => setForm({ ...form, match_name: e.target.value })} /></Field>
                <Field label="League"><input className={inputCls} value={form.league} onChange={(e) => setForm({ ...form, league: e.target.value })} /></Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label={participantLabels(form.sport).home}><input className={inputCls} value={form.home_team} onChange={(e) => setForm({ ...form, home_team: e.target.value })} /></Field>
                  <Field label={participantLabels(form.sport).away}><input className={inputCls} value={form.away_team} onChange={(e) => setForm({ ...form, away_team: e.target.value })} /></Field>
                </div>
                <Field label="Kickoff"><input type="datetime-local" className={inputCls} value={form.kickoff_at} onChange={(e) => setForm({ ...form, kickoff_at: e.target.value })} /></Field>
                <Field label="Prediction"><input className={inputCls} value={form.prediction} onChange={(e) => setForm({ ...form, prediction: e.target.value })} placeholder="e.g. Home & Over 2.5" /></Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Odds"><input type="number" step="0.01" className={inputCls} value={form.odds} onChange={(e) => setForm({ ...form, odds: e.target.value })} /></Field>
                  <Field label="Confidence 1–5"><input type="number" min={1} max={5} className={inputCls} value={form.confidence} onChange={(e) => setForm({ ...form, confidence: Number(e.target.value) })} /></Field>
                </div>
                <Field label={form.tier === "free" ? "Release at (uses channel drop time)" : "Release at"}>
                  <input
                    type="datetime-local"
                    className={inputCls}
                    value={form.release_at}
                    onChange={(e) => setForm({ ...form, release_at: e.target.value })}
                    disabled={form.tier === "free"}
                  />
                </Field>
                {form.tier === "free" && (
                  <p className="-mt-1 text-[11px] leading-relaxed text-gold/75">
                    Free picks are released together. Set the shared time in the Channels tab.
                  </p>
                )}
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.published} onChange={(e) => setForm({ ...form, published: e.target.checked })} /> Published</label>
                <div className="flex gap-2 pt-4">
                  <button onClick={submit} disabled={upsertMut.isPending} className="rounded-full gold-bg px-5 py-2.5 text-sm font-semibold flex-1">{form.id ? "Update" : "Create"}</button>
                  <button onClick={() => setOpen(false)} className="rounded-full glass px-5 py-2.5 text-sm">Cancel</button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

/* --- Channels --- */
function ChannelsTab() {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["channels"],
    queryFn: async () => (await supabase.from("channel_settings").select("*")).data ?? [],
  });
  const fn = useServerFn(updateChannelSettingsAdmin);
  const mut = useMutation({
    mutationFn: (d: Parameters<typeof fn>[0]["data"]) => fn({ data: d }),
    onSuccess: () => { toast.success("Updated"); qc.invalidateQueries({ queryKey: ["channels"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-3xl">Channels</h2>
        <p className="text-sm text-muted-foreground">Set the shared drop time for each channel. Free picks release together.</p>
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        {(q.data ?? []).map((c: any) => (
          <ChannelCard key={c.channel} item={c} onSave={(d) => mut.mutate(d)} />
        ))}
      </div>
    </div>
  );
}
function ChannelCard({ item, onSave }: { item: { channel: "A" | "B"; next_release_at: string; release_interval_minutes: number }; onSave: (d: { channel: "A" | "B"; next_release_at: string; release_interval_minutes: number }) => void }) {
  const [next, setNext] = useState(new Date(item.next_release_at).toISOString().slice(0, 16));
  const [interval, setInterval] = useState(item.release_interval_minutes);
  return (
    <div className="card-noir rounded-2xl p-6">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-2xl">Channel {item.channel}</h3>
        <Radio className="h-5 w-5 text-gold" />
      </div>
      <div className="mt-4 space-y-3">
        <Field label="Free picks release together at">
          <input type="datetime-local" className={inputCls} value={next} onChange={(e) => setNext(e.target.value)} />
        </Field>
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          Every free pick assigned to Channel {item.channel} uses this exact release time, so the two free matches arrive as one drop.
        </p>
        <Field label="Release interval (minutes)"><input type="number" className={inputCls} value={interval} onChange={(e) => setInterval(Number(e.target.value))} /></Field>
        <button
          onClick={() => onSave({ channel: item.channel, next_release_at: new Date(next).toISOString(), release_interval_minutes: interval })}
          className="rounded-full gold-bg px-5 py-2 text-sm font-semibold"
        >Save</button>
      </div>
    </div>
  );
}

/* --- Users --- */
function UsersTab() {
  const qc = useQueryClient();
  const listFn = useServerFn(listUsersAdmin);
  const q = useQuery({ queryKey: ["admin-users"], queryFn: () => listFn() });
  const updateFn = useServerFn(updateUserAdmin);
  const vipFn = useServerFn(setMemberVipAdmin);
  const mut = useMutation({
    mutationFn: (d: Parameters<typeof updateFn>[0]["data"]) => updateFn({ data: d }),
    onSuccess: () => { toast.success("Updated"); qc.invalidateQueries({ queryKey: ["admin-users"] }); },
  });
  const vipMut = useMutation({
    mutationFn: (d: { id: string; is_vip: boolean }) => vipFn({ data: d }),
    onSuccess: () => { toast.success("VIP updated"); qc.invalidateQueries({ queryKey: ["admin-users"] }); },
  });
  const [search, setSearch] = useState("");
  const filtered = (q.data ?? []).filter((u: any) =>
    u.full_name.toLowerCase().includes(search.toLowerCase()) || u.whatsapp.includes(search)
  );
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-display text-3xl">Members</h2>
          <p className="text-sm text-muted-foreground">Toggle channel, status and VIP access.</p>
        </div>
        <div className="relative">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            placeholder="Search name or WhatsApp"
            className={`${inputCls} pl-9 w-72 max-w-full`}
            value={search} onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="card-noir rounded-2xl overflow-hidden">
        <div className="grid grid-cols-[1fr_140px_100px_100px_90px] gap-3 px-5 py-3 text-[10px] uppercase tracking-widest text-gold border-b border-border/60">
          <div>Member</div><div>WhatsApp</div><div>Channel</div><div>Status</div><div className="text-right">VIP</div>
        </div>
        <div className="divide-y divide-border/40">
          {filtered.length === 0 && (
            <div className="p-10 text-center text-sm text-muted-foreground">No members match.</div>
          )}
          {filtered.map((u: any) => (
            <div key={u.id} className="grid grid-cols-[1fr_140px_100px_100px_90px] gap-3 px-5 py-3 items-center hover:bg-white/[0.02]">
              <div className="min-w-0">
                <div className="font-display text-base truncate">{u.full_name}</div>
                <div className="text-[10px] text-muted-foreground">Joined {new Date(u.created_at).toLocaleDateString()}</div>
              </div>
              <div className="text-xs text-muted-foreground truncate">{u.whatsapp}</div>
              <select value={u.channel} onChange={(e) => mut.mutate({ id: u.id, channel: e.target.value as "A" | "B" })} className={selectCls}>
                <option value="A">A</option><option value="B">B</option>
              </select>
              <select value={u.status} onChange={(e) => mut.mutate({ id: u.id, status: e.target.value as "active" | "disabled" })} className={selectCls}>
                <option value="active">Active</option><option value="disabled">Disabled</option>
              </select>
              <div className="flex justify-end">
                <button
                  onClick={() => vipMut.mutate({ id: u.id, is_vip: !u.is_vip })}
                  className={`rounded-full px-3 py-1 text-[10px] uppercase tracking-widest inline-flex items-center gap-1 ${u.is_vip ? "gold-bg font-bold" : "glass text-muted-foreground hover:border-gold/40"}`}
                >
                  <Crown className="h-3 w-3" /> {u.is_vip ? "VIP" : "Set"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* --- Announcements --- */
function AnnouncementsTab() {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["announcements-admin"],
    queryFn: async () => (await supabase.from("announcements").select("*").order("created_at", { ascending: false })).data ?? [],
  });
  const fn = useServerFn(createAnnouncementAdmin);
  const [form, setForm] = useState<{ target: "all" | "A" | "B"; title: string; body: string }>({ target: "all", title: "", body: "" });
  const mut = useMutation({
    mutationFn: (d: Parameters<typeof fn>[0]["data"]) => fn({ data: d }),
    onSuccess: () => { toast.success("Sent"); qc.invalidateQueries({ queryKey: ["announcements-admin"] }); setForm({ target: "all", title: "", body: "" }); },
  });
  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-3xl">Broadcasts</h2>
        <p className="text-sm text-muted-foreground">Push announcements to all members or a channel.</p>
      </div>
      <div className="card-noir rounded-2xl p-6 space-y-3">
        <div className="grid gap-3 sm:grid-cols-[160px_1fr]">
          <Field label="Audience">
            <select value={form.target} onChange={(e) => setForm({ ...form, target: e.target.value as "all" | "A" | "B" })} className={inputCls}>
              <option value="all">Everyone</option>
              <option value="A">Channel A</option>
              <option value="B">Channel B</option>
            </select>
          </Field>
          <Field label="Title"><input className={inputCls} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="New fixed match live" /></Field>
        </div>
        <Field label="Body"><textarea rows={3} className={inputCls} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} placeholder="Write your broadcast..." /></Field>
        <div>
          <button
            onClick={() => mut.mutate(form)}
            disabled={!form.title || !form.body}
            className="rounded-full gold-bg px-5 py-2 text-sm font-semibold disabled:opacity-60 inline-flex items-center gap-1.5"
          ><Megaphone className="h-4 w-4" /> Broadcast</button>
        </div>
      </div>

      <div className="space-y-3">
        {(q.data ?? []).map((a: any) => (
          <div key={a.id} className="card-noir rounded-2xl p-5 border-l-2 border-gold/60">
            <div className="flex items-center justify-between">
              <div className="font-display text-lg">{a.title}</div>
              <span className="text-[10px] uppercase tracking-widest text-gold">{a.target === "all" ? "All" : `Ch. ${a.target}`}</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">{a.body}</p>
            <p className="text-[10px] text-muted-foreground mt-2">{new Date(a.created_at).toLocaleString()}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/* --- Site settings --- */
function SettingsTab() {
  const qc = useQueryClient();
  const { settings } = useSiteSettings();
  const fn = useServerFn(updateSiteSettings);
  const [form, setForm] = useState({
    site_name: settings.site_name,
    tagline: settings.tagline,
    logo_url: settings.logo_url ?? "",
    primary_color: settings.primary_color,
    accent_color: settings.accent_color,
  });
  const mut = useMutation({
    mutationFn: (d: typeof form) => fn({
      data: {
        site_name: d.site_name,
        tagline: d.tagline,
        logo_url: d.logo_url || null,
        primary_color: d.primary_color,
        accent_color: d.accent_color,
      },
    }),
    onSuccess: () => { toast.success("Saved"); qc.invalidateQueries(); },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-3xl">Branding</h2>
        <p className="text-sm text-muted-foreground">Adjust site name, tagline, and colors.</p>
      </div>
      <div className="card-noir rounded-2xl p-6 max-w-2xl space-y-3">
        <Field label="Website name"><input className={inputCls} value={form.site_name} onChange={(e) => setForm({ ...form, site_name: e.target.value })} /></Field>
        <Field label="Tagline"><input className={inputCls} value={form.tagline} onChange={(e) => setForm({ ...form, tagline: e.target.value })} /></Field>
        <Field label="Logo URL (optional)"><input className={inputCls} value={form.logo_url} onChange={(e) => setForm({ ...form, logo_url: e.target.value })} placeholder="https://…" /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Primary color"><input type="color" className="h-11 w-full rounded-xl bg-transparent border border-border" value={form.primary_color} onChange={(e) => setForm({ ...form, primary_color: e.target.value })} /></Field>
          <Field label="Accent color"><input type="color" className="h-11 w-full rounded-xl bg-transparent border border-border" value={form.accent_color} onChange={(e) => setForm({ ...form, accent_color: e.target.value })} /></Field>
        </div>
        <button onClick={() => mut.mutate(form)} className="rounded-full gold-bg px-5 py-2 text-sm font-semibold">Save</button>
      </div>
    </div>
  );
}

/* helpers */
const inputCls = "w-full rounded-xl bg-surface-2 border border-border px-4 py-2.5 outline-none focus:border-gold text-sm";
const selectCls = "rounded-lg bg-surface-2 border border-border px-2 py-1 text-xs outline-none focus:border-gold";
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}
