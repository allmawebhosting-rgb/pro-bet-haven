import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type UnlockStatus = "pending" | "approved" | "rejected";

const MAX_IMAGE_CHARS = 1_600_000;

function cleanImage(v?: string | null) {
  const s = (v ?? "").trim();
  if (!s) return null;
  if (!s.startsWith("data:image/")) throw new Error("Invalid image");
  if (s.length > MAX_IMAGE_CHARS) throw new Error("Image is too large — try a smaller screenshot");
  return s;
}

async function assertAdmin(supabase: any, userId: string) {
  const { data } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (!data) throw new Error("Forbidden");
}

/* ---------- member ---------- */

export const requestUnlock = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { predictionId: string; proofImageUrl?: string; note?: string }) => d)
  .handler(async ({ data, context }) => {
    const proof = cleanImage(data.proofImageUrl);
    if (!proof) throw new Error("Please attach a screenshot of your share");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: existing } = await supabaseAdmin
      .from("share_unlocks")
      .select("id, status")
      .eq("user_id", context.userId)
      .eq("prediction_id", data.predictionId)
      .maybeSingle();

    if (existing?.status === "approved") return { status: "approved" as UnlockStatus };

    const payload = {
      user_id: context.userId,
      prediction_id: data.predictionId,
      proof_image_url: proof,
      note: (data.note ?? "").trim().slice(0, 500) || null,
      status: "pending" as const,
      reviewed_at: null,
      reviewed_by: null,
    };

    const { error } = existing
      ? await supabaseAdmin.from("share_unlocks").update(payload).eq("id", existing.id)
      : await supabaseAdmin.from("share_unlocks").insert(payload);
    if (error) throw new Error(error.message);
    return { status: "pending" as UnlockStatus };
  });

export const listMyUnlocks = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("share_unlocks")
      .select("prediction_id, status, created_at")
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

/* ---------- admin ---------- */

export const listUnlocksAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("share_unlocks")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);

    const userIds = [...new Set((rows ?? []).map((r) => r.user_id))];
    const predIds = [...new Set((rows ?? []).map((r) => r.prediction_id))];
    const [{ data: profs }, { data: preds }] = await Promise.all([
      userIds.length
        ? supabaseAdmin.from("profiles").select("id, full_name, channel").in("id", userIds)
        : Promise.resolve({ data: [] as any[] }),
      predIds.length
        ? supabaseAdmin.from("predictions").select("id, home_team, away_team, league, kickoff_at").in("id", predIds)
        : Promise.resolve({ data: [] as any[] }),
    ]);
    const byUser = new Map((profs ?? []).map((p) => [p.id, p]));
    const byPred = new Map((preds ?? []).map((p) => [p.id, p]));

    return (rows ?? []).map((r) => ({
      ...r,
      member: byUser.get(r.user_id) ?? null,
      pick: byPred.get(r.prediction_id) ?? null,
    }));
  });

export const reviewUnlockAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; status: Exclude<UnlockStatus, "pending"> }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("share_unlocks")
      .update({ status: data.status, reviewed_at: new Date().toISOString(), reviewed_by: context.userId })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
