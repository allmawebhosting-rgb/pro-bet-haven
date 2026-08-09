import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { SPORTS } from "@/lib/sports";

async function assertAdmin(supabase: any, userId: string) {
  const { data } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (!data) throw new Error("Forbidden");
}

const announcementSchema = z.object({
  body: z.string().trim().min(1).max(2000),
  title: z.string().trim().max(120).optional().default(""),
  target: z.enum(["all", "A", "B"]),
  pinned: z.boolean().optional().default(false),
});

export const postAnnouncement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => announcementSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    if (data.pinned) {
      const q = supabaseAdmin.from("announcements").update({ pinned: false }).eq("pinned", true);
      if (data.target === "all") await q;
      else await q.eq("channel", data.target);
    }

    const channel = data.target === "all" ? null : data.target;
    const firstLine = data.body.split("\n")[0]?.slice(0, 80) || "Broadcast";
    const { error } = await supabaseAdmin.from("announcements").insert({
      target: data.target,
      channel,
      title: data.title || firstLine,
      body: data.body,
      pinned: data.pinned,
      author_id: context.userId,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const matchSchema = z.object({
  target: z.enum(["A", "B", "all"]),
  sport: z.enum(SPORTS).default("football"),
  league: z.string().trim().min(1).max(80),
  home_team: z.string().trim().min(1).max(80),
  away_team: z.string().trim().min(1).max(80),
  kickoff_at: z.string().min(1),
  prediction: z.string().trim().min(1).max(120),
  odds: z.number().nullable().optional(),
  confidence: z.number().int().min(1).max(5).default(3),
  tier: z.enum(["free", "vip"]).default("vip"),
});

export const postMatchPick = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => matchSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const targets: Array<"A" | "B"> = data.target === "all" ? ["A", "B"] : [data.target];
    const now = new Date().toISOString();
    const { data: channelSettings } = await supabaseAdmin
      .from("channel_settings")
      .select("channel, next_release_at")
      .in("channel", targets);
    const releaseByChannel = new Map(
      (channelSettings ?? []).map((setting) => [setting.channel as "A" | "B", setting.next_release_at]),
    );
    const rows = targets.map((channel) => ({
      channel,
      sport: data.sport,
      match_name: `${data.home_team} vs ${data.away_team}`,
      league: data.league,
      home_team: data.home_team,
      away_team: data.away_team,
      kickoff_at: data.kickoff_at,
      prediction: data.prediction,
      odds: data.odds ?? null,
      confidence: data.confidence,
      published: true,
      // Free picks are a single scheduled drop, not separate releases.
      release_at: data.tier === "free" ? (releaseByChannel.get(channel) ?? now) : now,
      tier: data.tier,
    }));
    const { error } = await supabaseAdmin.from("predictions").insert(rows);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const markTourCompleted = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("profiles")
      .update({ tour_completed: true })
      .eq("id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const updateLastSeen = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ seen_at: z.string().min(1) }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("profiles")
      .update({ last_seen_at: new Date(data.seen_at).toISOString() })
      .eq("id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const amIAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    return { admin: !!data };
  });

