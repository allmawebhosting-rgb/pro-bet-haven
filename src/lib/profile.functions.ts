import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getOrCreateMyProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: existing, error: readError } = await context.supabase
      .from("profiles")
      .select("*")
      .eq("id", context.userId)
      .maybeSingle();

    if (readError) throw new Error(readError.message);
    if (existing) return { profile: existing };

    const { data: authData, error: authError } = await context.supabase.auth.getUser();
    if (authError || !authData.user) {
      throw new Error("We could not verify your account. Please sign in again.");
    }

    const metadata = authData.user.user_metadata as {
      full_name?: unknown;
      name?: unknown;
    };
    const fullName =
      (typeof metadata.full_name === "string" && metadata.full_name.trim()) ||
      (typeof metadata.name === "string" && metadata.name.trim()) ||
      "Member";

    const channel: "A" | "B" = Math.random() < 0.5 ? "A" : "B";
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error: profileError } = await supabaseAdmin.from("profiles").upsert(
      { id: context.userId, full_name: fullName, whatsapp: "", channel },
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
    return { profile };
  });
