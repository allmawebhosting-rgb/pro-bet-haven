import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/Logo";
import {
  listUsersAdmin, updateUserAdmin, upsertPredictionAdmin, deletePredictionAdmin,
  updateChannelSettingsAdmin, createAnnouncementAdmin, grantAdminSelf, adminAnalytics,
} from "@/lib/admin.functions";
import { updateSiteSettings } from "@/lib/site.functions";
import { useSiteSettings } from "@/lib/site-context";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [{ title: "Admin — Aurum" }, { name: "robots", content: "noindex" }],
  }),
  component: AdminPage,
});

type Tab = "predictions" | "users" | "announcements" | "settings" | "channels";

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
        <div className="glass-strong rounded-3xl p-8 max-w-md w-full">
          <p className="text-xs uppercase tracking-[0.25em] text-gold text-center">Admin bootstrap</p>
          <h1 className="mt-2 font-display text-3xl text-center">First-time setup</h1>
          <p className="mt-2 text-sm text-muted-foreground text-center">
            Enter the founder setup code to become the first admin. This is only available before any admin exists.
          </p>
          <div className="mt-6 space-y-3">
            <input
              type="password" value={secret} onChange={(e) => setSecret(e.target.value)}
              className="w-full rounded-xl bg-surface-2 border border-border px-4 py-3 outline-none focus:border-gold"
              placeholder="Setup code"
            />
            <button
              onClick={() => grantMut.mutate(secret)}
              disabled={grantMut.isPending}
              className="w-full rounded-full gold-bg px-5 py-3 text-sm font-semibold"
            >
              {grantMut.isPending ? "Granting…" : "Become admin"}
            </button>
            <p className="text-center text-xs text-muted-foreground">Default code: <b className="text-foreground">aurum-founder</b></p>
            <Link to="/dashboard" className="block text-center text-xs text-muted-foreground hover:text-gold mt-3">← Back to dashboard</Link>
          </div>
        </div>
      </div>
    );
  }

  return <AdminShell />;
}

function AdminShell() {
  const [tab, setTab] = useState<Tab>("predictions");
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-border/40 backdrop-blur-xl bg-background/70">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 h-16 flex items-center justify-between">
          <Logo />
          <span className="rounded-full glass px-3 py-1.5 text-xs uppercase tracking-widest text-gold">Admin</span>
        </div>
      </header>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8">
        <div className="glass rounded-full p-1 inline-flex gap-1 overflow-x-auto max-w-full mb-8">
          {(["predictions", "channels", "users", "announcements", "settings"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-full text-sm capitalize transition whitespace-nowrap ${
                tab === t ? "gold-bg text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >{t}</button>
          ))}
        </div>
        <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          {tab === "predictions" && <PredictionsTab />}
          {tab === "channels" && <ChannelsTab />}
          {tab === "users" && <UsersTab />}
          {tab === "announcements" && <AnnouncementsTab />}
          {tab === "settings" && <SettingsTab />}
        </motion.div>
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
    onSuccess: () => { toast.success("Saved"); qc.invalidateQueries({ queryKey: ["admin-predictions"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const delMut = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => { toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["admin-predictions"] }); },
  });

  const [form, setForm] = useState({
    id: undefined as string | undefined,
    channel: "A" as "A" | "B",
    match_name: "",
    league: "",
    home_team: "",
    away_team: "",
    kickoff_at: "",
    prediction: "",
    odds: "" as string,
    confidence: 3,
    published: true,
    release_at: "",
  });

  function submit() {
    if (!form.match_name || !form.home_team || !form.away_team || !form.kickoff_at) {
      toast.error("Fill in match details"); return;
    }
    upsertMut.mutate({
      id: form.id,
      channel: form.channel,
      match_name: form.match_name,
      league: form.league,
      home_team: form.home_team,
      away_team: form.away_team,
      kickoff_at: new Date(form.kickoff_at).toISOString(),
      prediction: form.prediction,
      odds: form.odds ? Number(form.odds) : null,
      confidence: form.confidence,
      published: form.published,
      release_at: form.release_at ? new Date(form.release_at).toISOString() : new Date().toISOString(),
    });
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_1.4fr]">
      <div className="glass-strong rounded-2xl p-6">
        <h2 className="font-display text-2xl mb-4">{form.id ? "Edit" : "Add"} prediction</h2>
        <div className="space-y-3 text-sm">
          <Field label="Channel">
            <select value={form.channel} onChange={(e) => setForm({ ...form, channel: e.target.value as "A" | "B" })} className={inputCls}>
              <option value="A">Channel A</option><option value="B">Channel B</option>
            </select>
          </Field>
          <Field label="Match name"><input className={inputCls} value={form.match_name} onChange={(e) => setForm({ ...form, match_name: e.target.value })} /></Field>
          <Field label="League"><input className={inputCls} value={form.league} onChange={(e) => setForm({ ...form, league: e.target.value })} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Home team"><input className={inputCls} value={form.home_team} onChange={(e) => setForm({ ...form, home_team: e.target.value })} /></Field>
            <Field label="Away team"><input className={inputCls} value={form.away_team} onChange={(e) => setForm({ ...form, away_team: e.target.value })} /></Field>
          </div>
          <Field label="Kickoff"><input type="datetime-local" className={inputCls} value={form.kickoff_at} onChange={(e) => setForm({ ...form, kickoff_at: e.target.value })} /></Field>
          <Field label="Prediction"><input className={inputCls} value={form.prediction} onChange={(e) => setForm({ ...form, prediction: e.target.value })} placeholder="e.g. Home win" /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Odds"><input type="number" step="0.01" className={inputCls} value={form.odds} onChange={(e) => setForm({ ...form, odds: e.target.value })} /></Field>
            <Field label="Confidence 1–5"><input type="number" min={1} max={5} className={inputCls} value={form.confidence} onChange={(e) => setForm({ ...form, confidence: Number(e.target.value) })} /></Field>
          </div>
          <Field label="Release at"><input type="datetime-local" className={inputCls} value={form.release_at} onChange={(e) => setForm({ ...form, release_at: e.target.value })} /></Field>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.published} onChange={(e) => setForm({ ...form, published: e.target.checked })} /> Published</label>
          <div className="flex gap-2 pt-2">
            <button onClick={submit} className="rounded-full gold-bg px-5 py-2 text-sm font-semibold">{form.id ? "Update" : "Create"}</button>
            {form.id && <button onClick={() => setForm({ ...form, id: undefined })} className="rounded-full glass px-4 py-2 text-sm">New</button>}
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {(listQ.data ?? []).map((p) => (
          <div key={p.id} className="glass rounded-2xl p-4 grid gap-2 sm:grid-cols-[1fr_auto] items-center">
            <div className="min-w-0">
              <div className="text-xs text-gold uppercase tracking-widest">Ch. {p.channel} · {p.league}</div>
              <div className="font-display text-lg truncate">{p.home_team} vs {p.away_team}</div>
              <div className="text-xs text-muted-foreground">
                Kickoff: {new Date(p.kickoff_at).toLocaleString()} · Release: {new Date(p.release_at).toLocaleString()} ·{" "}
                {p.published ? <span className="text-gold">Published</span> : <span>Hidden</span>}
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setForm({
                  id: p.id, channel: p.channel, match_name: p.match_name, league: p.league,
                  home_team: p.home_team, away_team: p.away_team,
                  kickoff_at: new Date(p.kickoff_at).toISOString().slice(0, 16),
                  prediction: p.prediction, odds: p.odds?.toString() ?? "",
                  confidence: p.confidence, published: p.published,
                  release_at: new Date(p.release_at).toISOString().slice(0, 16),
                })}
                className="rounded-full glass px-3 py-1.5 text-xs"
              >Edit</button>
              <button onClick={() => delMut.mutate(p.id)} className="rounded-full px-3 py-1.5 text-xs text-destructive border border-destructive/40">Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* --- Channels (timers) --- */
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
    <div className="grid gap-6 md:grid-cols-2">
      {(q.data ?? []).map((c) => (
        <ChannelCard key={c.channel} item={c} onSave={(d) => mut.mutate(d)} />
      ))}
    </div>
  );
}
function ChannelCard({ item, onSave }: { item: { channel: "A" | "B"; next_release_at: string; release_interval_minutes: number }; onSave: (d: { channel: "A" | "B"; next_release_at: string; release_interval_minutes: number }) => void }) {
  const [next, setNext] = useState(new Date(item.next_release_at).toISOString().slice(0, 16));
  const [interval, setInterval] = useState(item.release_interval_minutes);
  return (
    <div className="glass-strong rounded-2xl p-6">
      <h3 className="font-display text-2xl">Channel {item.channel}</h3>
      <div className="mt-4 space-y-3">
        <Field label="Next release"><input type="datetime-local" className={inputCls} value={next} onChange={(e) => setNext(e.target.value)} /></Field>
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
  const mut = useMutation({
    mutationFn: (d: Parameters<typeof updateFn>[0]["data"]) => updateFn({ data: d }),
    onSuccess: () => { toast.success("Updated"); qc.invalidateQueries({ queryKey: ["admin-users"] }); },
  });
  const analyticsFn = useServerFn(adminAnalytics);
  const aq = useQuery({ queryKey: ["admin-analytics"], queryFn: () => analyticsFn() });
  const [search, setSearch] = useState("");
  const filtered = (q.data ?? []).filter((u) =>
    u.full_name.toLowerCase().includes(search.toLowerCase()) || u.whatsapp.includes(search)
  );
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-4">
        {[
          { l: "Total", v: aq.data?.total ?? 0 },
          { l: "Channel A", v: aq.data?.chA ?? 0 },
          { l: "Channel B", v: aq.data?.chB ?? 0 },
          { l: "Last 7 days", v: aq.data?.last7 ?? 0 },
        ].map((s) => (
          <div key={s.l} className="glass rounded-2xl p-4">
            <div className="text-xs uppercase tracking-widest text-muted-foreground">{s.l}</div>
            <div className="mt-2 font-display text-3xl gold-text">{s.v}</div>
          </div>
        ))}
      </div>
      <input
        placeholder="Search by name or WhatsApp"
        className={inputCls} value={search} onChange={(e) => setSearch(e.target.value)}
      />
      <div className="space-y-2">
        {filtered.map((u) => (
          <div key={u.id} className="glass rounded-2xl p-4 grid gap-2 sm:grid-cols-[1fr_auto] items-center">
            <div className="min-w-0">
              <div className="font-display text-lg truncate">{u.full_name}</div>
              <div className="text-xs text-muted-foreground">{u.whatsapp} · Joined {new Date(u.created_at).toLocaleDateString()}</div>
            </div>
            <div className="flex flex-wrap gap-2 items-center text-xs">
              <select value={u.channel} onChange={(e) => mut.mutate({ id: u.id, channel: e.target.value as "A" | "B" })} className={selectCls}>
                <option value="A">A</option><option value="B">B</option>
              </select>
              <select value={u.status} onChange={(e) => mut.mutate({ id: u.id, status: e.target.value as "active" | "disabled" })} className={selectCls}>
                <option value="active">Active</option><option value="disabled">Disabled</option>
              </select>
            </div>
          </div>
        ))}
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
  const mut = useMutation({
    mutationFn: (d: Parameters<typeof fn>[0]["data"]) => fn({ data: d }),
    onSuccess: () => { toast.success("Sent"); qc.invalidateQueries({ queryKey: ["announcements-admin"] }); setForm({ target: "all", title: "", body: "" }); },
  });
  const [form, setForm] = useState<{ target: "all" | "A" | "B"; title: string; body: string }>({ target: "all", title: "", body: "" });
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="glass-strong rounded-2xl p-6 space-y-3">
        <h2 className="font-display text-2xl mb-2">New announcement</h2>
        <Field label="Audience">
          <select value={form.target} onChange={(e) => setForm({ ...form, target: e.target.value as "all" | "A" | "B" })} className={inputCls}>
            <option value="all">Everyone</option>
            <option value="A">Channel A only</option>
            <option value="B">Channel B only</option>
          </select>
        </Field>
        <Field label="Title"><input className={inputCls} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
        <Field label="Body"><textarea rows={4} className={inputCls} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} /></Field>
        <button
          onClick={() => mut.mutate(form)}
          disabled={!form.title || !form.body}
          className="rounded-full gold-bg px-5 py-2 text-sm font-semibold disabled:opacity-60"
        >Send</button>
      </div>
      <div className="space-y-3">
        {(q.data ?? []).map((a) => (
          <div key={a.id} className="glass rounded-2xl p-4">
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
    <div className="glass-strong rounded-2xl p-6 max-w-2xl space-y-3">
      <h2 className="font-display text-2xl mb-2">Site branding</h2>
      <Field label="Website name"><input className={inputCls} value={form.site_name} onChange={(e) => setForm({ ...form, site_name: e.target.value })} /></Field>
      <Field label="Tagline"><input className={inputCls} value={form.tagline} onChange={(e) => setForm({ ...form, tagline: e.target.value })} /></Field>
      <Field label="Logo URL (optional)"><input className={inputCls} value={form.logo_url} onChange={(e) => setForm({ ...form, logo_url: e.target.value })} placeholder="https://…" /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Primary color"><input type="color" className="h-11 w-full rounded-xl bg-transparent border border-border" value={form.primary_color} onChange={(e) => setForm({ ...form, primary_color: e.target.value })} /></Field>
        <Field label="Accent color"><input type="color" className="h-11 w-full rounded-xl bg-transparent border border-border" value={form.accent_color} onChange={(e) => setForm({ ...form, accent_color: e.target.value })} /></Field>
      </div>
      <button onClick={() => mut.mutate(form)} className="rounded-full gold-bg px-5 py-2 text-sm font-semibold">Save</button>
    </div>
  );
}

/* helpers */
const inputCls = "w-full rounded-xl bg-surface-2 border border-border px-4 py-2.5 outline-none focus:border-gold text-sm";
const selectCls = "rounded-full bg-surface-2 border border-border px-3 py-1.5 outline-none focus:border-gold";
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs uppercase tracking-widest text-muted-foreground">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}
