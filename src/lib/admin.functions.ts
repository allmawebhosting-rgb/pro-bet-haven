import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(supabase: any, userId: string) {
  const { data: roles } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);
  if (!roles?.some((r: { role: string }) => r.role === "admin")) {
    throw new Error("Forbidden");
  }
}

export const listUsersAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const updateUserAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: {
    id: string;
    channel?: "A" | "B";
    status?: "active" | "disabled";
  }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const patch: { channel?: "A" | "B"; status?: "active" | "disabled" } = {};
    if (data.channel) patch.channel = data.channel;
    if (data.status) patch.status = data.status;
    const { error } = await supabaseAdmin.from("profiles").update(patch).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const upsertPredictionAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: {
    id?: string;
    channel: "A" | "B";
    sport?: string;
    match_name: string;
    league: string;
    home_team: string;
    away_team: string;
    kickoff_at: string;
    prediction: string;
    odds: number | null;
    confidence: number;
    published: boolean;
    release_at: string;
    tier: "free" | "vip";
  }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const payload = { ...data, sport: data.sport ?? "football", release_at: data.release_at };
    if (data.id) {
      const { id: _id, ...patch } = payload;
      const { error } = await supabaseAdmin.from("predictions").update(patch).eq("id", data.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabaseAdmin.from("predictions").insert(payload);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const setMemberVipAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; is_vip: boolean }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("profiles").update({ is_vip: data.is_vip }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deletePredictionAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("predictions").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const updateChannelSettingsAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: {
    channel: "A" | "B";
    next_release_at: string;
    release_interval_minutes: number;
  }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("channel_settings")
      .update({
        next_release_at: data.next_release_at,
        release_interval_minutes: data.release_interval_minutes,
        updated_at: new Date().toISOString(),
      })
      .eq("channel", data.channel);
    if (error) throw new Error(error.message);

    // Keep all not-yet-released free picks in this channel synchronized to
    // the new drop time, so a two-pick free bundle is delivered together.
    const now = new Date().toISOString();
    const { error: syncError } = await supabaseAdmin
      .from("predictions")
      .update({ release_at: data.next_release_at })
      .eq("channel", data.channel)
      .eq("tier", "free")
      .gte("release_at", now);
    if (syncError) throw new Error(syncError.message);
    return { ok: true };
  });

export const createAnnouncementAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { target: "all" | "A" | "B"; title: string; body: string }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("announcements").insert(data);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const grantAdminSelf = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { secret: string }) => d)
  .handler(async ({ data, context }) => {
    // First-admin bootstrap: any signed-in user who knows the setup code becomes admin.
    // Once at least one admin exists, this bootstrap is closed.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: existing } = await supabaseAdmin
      .from("user_roles")
      .select("id")
      .eq("role", "admin")
      .limit(1);
    if (existing && existing.length > 0) {
      throw new Error("Admin already exists — ask an existing admin to grant access.");
    }
    if (data.secret !== "allma2580") throw new Error("Invalid setup code");
    const { error } = await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: context.userId, role: "admin" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminAnalytics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: profs } = await supabaseAdmin.from("profiles").select("channel, created_at, status");
    const total = profs?.length ?? 0;
    const chA = profs?.filter((p) => p.channel === "A").length ?? 0;
    const chB = profs?.filter((p) => p.channel === "B").length ?? 0;
    const active = profs?.filter((p) => p.status === "active").length ?? 0;
    const now = Date.now();
    const last7 = profs?.filter((p) => now - new Date(p.created_at).getTime() < 7 * 864e5).length ?? 0;
    return { total, chA, chB, active, last7 };
  });
