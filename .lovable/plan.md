## Goal

After signing in or registering, the user should land in their channel automatically — no refresh, no re-entering details.

## What I confirmed in the code

- `src/routes/auth.tsx` calls `supabase.auth.signInWithPassword(...)` and immediately `navigate({ to: "/dashboard" })`.
- `src/routes/register.tsx` calls `signUp(...)`, optionally `signInWithPassword(...)`, then immediately `navigate({ to: "/welcome" })`.
- `src/routes/_authenticated/route.tsx` gates the subtree with `beforeLoad: supabase.auth.getUser()` and redirects to `/auth` on any error or missing user.
- `src/routes/__root.tsx` subscribes to `onAuthStateChange` and calls `router.invalidate()` + `queryClient.invalidateQueries()` on `SIGNED_IN`.

So the navigation to a protected route happens in the same tick as the auth state change, while the root subscriber is invalidating the router. The protected gate's `getUser()` is a network call that can resolve before the session is persisted/attached, and any error is treated as "not signed in" → bounced back to `/auth`. That's consistent with the reported symptom, but I have not yet reproduced it in the browser, so **step 1 of this plan is to reproduce and confirm** before changing behavior.

## Plan

1. **Reproduce** the flow in a headless browser against the running app: register a fresh number, then sign in, capturing console errors, network 401s, and the final URL at each step. This confirms whether the bounce comes from the gate's `getUser()`, from an unconfirmed-email signup (no session returned), or from the invalidate/navigate race.

2. **Make sign-in wait for a real session before navigating** (`src/routes/auth.tsx`): after `signInWithPassword`, use the returned `data.session` (falling back to a short `onAuthStateChange`/`getSession` wait) and only then `navigate({ to: "/dashboard", replace: true })`. Surface a clear error instead of silently staying on the form.

3. **Same for registration** (`src/routes/register.tsx`): after `signUp`, if no session comes back, sign in and wait for the session before `navigate({ to: "/welcome", replace: true })`. If the backend requires email confirmation for these synthetic `wa_*@aurum.members` addresses, no session can ever be issued — in that case enable auto-confirm for email signups so the WhatsApp-number flow works as designed (this is what the flow already assumes).

4. **Harden the protected gate** (`src/routes/_authenticated/route.tsx`): treat a transient `getUser()` failure differently from "no user" — check the local session first and only redirect to `/auth` when there genuinely is no session, so a slow or flaky call no longer kicks a freshly signed-in user out.

5. **Avoid the invalidate/navigate race** (`src/routes/__root.tsx`): keep the single subscriber, but let the explicit post-login navigation win instead of being cancelled by a concurrent `router.invalidate()`.

6. **Verify end to end** in the browser: fresh registration lands on `/welcome` → `/dashboard`, and a returning sign-in lands directly on `/dashboard`, both on the first attempt with no refresh.

## Technical notes

- No database schema changes. Step 3 may require one auth setting change (auto-confirm email signups), which is required by the existing WhatsApp-as-email design.
- Navigations use `replace: true` so the back button doesn't return to the sign-in form after a successful login.
