import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const getOrCreateMyProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: existing, error: readError } = await context.supabase
      .from("profiles")
      .select("*")
      .eq("id", context.userId)
      .maybeSingle();

    if (readError) throw new Error(readError.message);
    if (existing) return { needsOnboarding: false as const, profile: existing };

    const { data: authData, error: authError } = await context.supabase.auth.getUser();
    if (authError || !authData.user) {
      throw new Error("We could not verify your account. Please sign in again.");
    }

    const metadata = authData.user.user_metadata as {
      full_name?: unknown;
      whatsapp?: unknown;
      name?: unknown;
    };
    const fullName =
      (typeof metadata.full_name === "string" && metadata.full_name.trim()) ||
      (typeof metadata.name === "string" && metadata.name.trim()) ||
      "";
    const whatsapp = typeof metadata.whatsapp === "string" ? metadata.whatsapp.trim() : "";

    // If WhatsApp is missing (Google sign-in), route the user through onboarding.
    if (!whatsapp) {
      return {
        needsOnboarding: true as const,
        suggestedFullName: fullName,
      };
    }

    const channel: "A" | "B" = Math.random() < 0.5 ? "A" : "B";
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error: profileError } = await supabaseAdmin.from("profiles").upsert(
      { id: context.userId, full_name: fullName || "Member", whatsapp, channel },
      { onConflict: "id", ignoreDuplicates: true },
    );
    if (profileError) throw new Error(profileError.message);

    const { error: roleError } = await supabaseAdmin
      .from("user_roles")
      .upsert(
        { user_id: context.userId, role: "user" },
        { onConflict: "user_id,role", ignoreDuplicates: true },
      );
    if (roleError) throw new Error(roleError.message);

    const { data: profile, error: finalReadError } = await context.supabase
      .from("profiles")
      .select("*")
      .eq("id", context.userId)
      .maybeSingle();

    if (finalReadError) throw new Error(finalReadError.message);
    if (!profile) throw new Error("Your member profile could not be loaded.");
    return { needsOnboarding: false as const, profile };
  });

const onboardingSchema = z.object({
  full_name: z.string().trim().min(2).max(100),
  whatsapp: z.string().trim().min(6).max(30),
});

export const completeOnboarding = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => onboardingSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { data: existing } = await context.supabase
      .from("profiles")
      .select("id, whatsapp")
      .eq("id", context.userId)
      .maybeSingle();

    if (existing && existing.whatsapp && existing.whatsapp.trim().length > 0) {
      return { ok: true, alreadyOnboarded: true };
    }

    const channel: "A" | "B" = Math.random() < 0.5 ? "A" : "B";
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error: profileError } = await supabaseAdmin.from("profiles").upsert(
      {
        id: context.userId,
        full_name: data.full_name,
        whatsapp: data.whatsapp,
        channel,
      },
      { onConflict: "id" },
    );
    if (profileError) throw new Error(profileError.message);

    const { error: roleError } = await supabaseAdmin
      .from("user_roles")
      .upsert(
        { user_id: context.userId, role: "user" },
        { onConflict: "user_id,role", ignoreDuplicates: true },
      );
    if (roleError) throw new Error(roleError.message);

    return { ok: true, alreadyOnboarded: false };
  });
