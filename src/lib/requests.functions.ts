import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type RequestKind = "upgrade" | "next_game" | "general";
export type RequestStatus = "open" | "answered" | "closed";

const MAX_BODY = 2000;
const MAX_SUBJECT = 140;

function cleanBody(v: string, allowEmpty = false) {
  const s = (v ?? "").trim();
  if (!s && !allowEmpty) throw new Error("Message cannot be empty");
  if (s.length > MAX_BODY) throw new Error(`Message must be under ${MAX_BODY} characters`);
  return s;
}

const MAX_IMAGE_CHARS = 1_600_000; // ~1.1MB base64 data URL

function cleanImage(v?: string | null) {
  const s = (v ?? "").trim();
  if (!s) return null;
  if (!s.startsWith("data:image/")) throw new Error("Invalid image");
  if (s.length > MAX_IMAGE_CHARS) throw new Error("Image is too large — try a smaller screenshot");
  return s;
}

function cleanSubject(v: string) {
  const s = (v ?? "").trim();
  if (!s) throw new Error("Subject cannot be empty");
  return s.slice(0, MAX_SUBJECT);
}

async function assertAdmin(supabase: any, userId: string) {
  const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", userId);
  if (!roles?.some((r: { role: string }) => r.role === "admin")) throw new Error("Forbidden");
}

/* ---------- member ---------- */

export const createRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { kind: RequestKind; subject: string; body: string; imageUrl?: string }) => d)
  .handler(async ({ data, context }) => {
    const subject = cleanSubject(data.subject);
    const imageUrl = cleanImage(data.imageUrl);
    const body = cleanBody(data.body, !!imageUrl);
    const { data: req, error } = await context.supabase
      .from("member_requests")
      .insert({ user_id: context.userId, kind: data.kind, subject })
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    const { error: msgErr } = await context.supabase
      .from("request_messages")
      .insert({ request_id: req.id, sender_id: context.userId, sender_role: "member", body, image_url: imageUrl });
    if (msgErr) throw new Error(msgErr.message);
    return { id: req.id as string };
  });

export const listMyRequests = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("member_requests")
      .select("id, kind, subject, status, last_message_at, created_at")
      .eq("user_id", context.userId)
      .order("last_message_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const listRequestMessages = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { requestId: string }) => d)
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("request_messages")
      .select("id, sender_role, body, created_at")
      .eq("request_id", data.requestId)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const postMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { requestId: string; body: string }) => d)
  .handler(async ({ data, context }) => {
    const body = cleanBody(data.body);
    const { data: req, error: reqErr } = await context.supabase
      .from("member_requests")
      .select("id, user_id")
      .eq("id", data.requestId)
      .maybeSingle();
    if (reqErr) throw new Error(reqErr.message);
    if (!req || req.user_id !== context.userId) throw new Error("Request not found");

    const { error } = await context.supabase
      .from("request_messages")
      .insert({ request_id: data.requestId, sender_id: context.userId, sender_role: "member", body });
    if (error) throw new Error(error.message);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin
      .from("member_requests")
      .update({ last_message_at: new Date().toISOString(), status: "open" })
      .eq("id", data.requestId);
    return { ok: true };
  });

/* ---------- admin ---------- */

export const listRequestsAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: reqs, error } = await supabaseAdmin
      .from("member_requests")
      .select("*")
      .order("last_message_at", { ascending: false })
      .limit(300);
    if (error) throw new Error(error.message);

    const ids = [...new Set((reqs ?? []).map((r) => r.user_id))];
    const { data: profs } = ids.length
      ? await supabaseAdmin.from("profiles").select("id, full_name, whatsapp, channel, is_vip").in("id", ids)
      : { data: [] as any[] };
    const byId = new Map((profs ?? []).map((p) => [p.id, p]));

    return (reqs ?? []).map((r) => ({
      ...r,
      member: byId.get(r.user_id) ?? null,
    }));
  });

export const listRequestMessagesAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { requestId: string }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("request_messages")
      .select("id, sender_role, body, created_at")
      .eq("request_id", data.requestId)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const replyRequestAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { requestId: string; body: string }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const body = cleanBody(data.body);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("request_messages")
      .insert({ request_id: data.requestId, sender_id: context.userId, sender_role: "admin", body });
    if (error) throw new Error(error.message);
    await supabaseAdmin
      .from("member_requests")
      .update({ last_message_at: new Date().toISOString(), status: "answered" })
      .eq("id", data.requestId);
    return { ok: true };
  });

export const setRequestStatusAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { requestId: string; status: RequestStatus }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("member_requests")
      .update({ status: data.status })
      .eq("id", data.requestId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
