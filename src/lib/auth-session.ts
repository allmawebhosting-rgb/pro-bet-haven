import { supabase } from "@/integrations/supabase/client";

/**
 * Resolves once a Supabase session is actually available in the client
 * (persisted + attachable as a bearer token), or null after `timeoutMs`.
 * Navigating to a protected route before this resolves can bounce the user
 * back to /auth.
 */
export async function waitForSession(timeoutMs = 6000) {
  const { data } = await supabase.auth.getSession();
  if (data.session) return data.session;

  return new Promise<Awaited<ReturnType<typeof supabase.auth.getSession>>["data"]["session"]>(
    (resolve) => {
      let settled = false;
      const finish = (
        session: Awaited<ReturnType<typeof supabase.auth.getSession>>["data"]["session"],
      ) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        clearInterval(poll);
        sub.subscription.unsubscribe();
        resolve(session);
      };

      const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
        if (session) finish(session);
      });

      const poll = setInterval(() => {
        supabase.auth.getSession().then(({ data: d }) => {
          if (d.session) finish(d.session);
        });
      }, 250);

      const timer = setTimeout(() => finish(null), timeoutMs);
    },
  );
}
