## Enable Google login

### 1. Provider activation
- Call `supabase--configure_social_auth` with `providers: ["google"]` (keep email enabled — existing WhatsApp members rely on it).

### 2. Auth UI
- Add a "Continue with Google" button on `src/routes/auth.tsx` and `src/routes/register.tsx` using `lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/auth/callback" })` from `@/integrations/lovable`.
- Divider ("or") separating Google button from the existing WhatsApp form.

### 3. Callback + WhatsApp prompt
- New public route `src/routes/auth.callback.tsx`: waits for session, then checks profile. If profile exists → `/dashboard`. If not → `/onboarding`.
- New route `src/routes/_authenticated/onboarding.tsx`: short form asking for Full Name (prefilled from Google `user_metadata.full_name`) and WhatsApp number (required, validated). Submits to a new server function.

### 4. Server function
- `src/lib/profile.functions.ts`: add `completeOnboarding({ full_name, whatsapp })` — authenticated, upserts profile with random Channel A/B assignment via `supabaseAdmin`, ensures `user` role. Reject if profile already exists with non-empty whatsapp.
- Update existing `getOrCreateMyProfile`: for Google users with no metadata WhatsApp, do NOT auto-create the profile — return a sentinel (`{ needsOnboarding: true }`) so the dashboard/callback can redirect to `/onboarding` instead of creating a blank profile.

### 5. Dashboard guard
- In `_authenticated/dashboard.tsx`, if the query result indicates onboarding needed, navigate to `/onboarding`.

### 6. Verify
- Playwright: load `/auth`, confirm Google button renders; simulate no-profile session and confirm redirect to `/onboarding`; confirm existing WhatsApp login still works.

### Technical notes
- Managed Google OAuth — no credentials needed from the user.
- `redirect_uri` must be public same-origin (`/auth/callback`), not `/dashboard`.
- Onboarding route sits under `_authenticated` so unauthenticated visits redirect to `/auth`.
- Profile `whatsapp` column is `NOT NULL` — the onboarding form enforces this before insert; no schema change required.
