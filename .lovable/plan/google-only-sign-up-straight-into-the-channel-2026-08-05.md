# Google-only sign-up, straight into the channel

No more WhatsApp number, no more name step, no more "complete your profile" screen. One button: continue with Google, then the channel feed.

## What changes for members

- **Sign in / Join screens**: a single "Continue with Google" button. The 3-step name → WhatsApp → confirm wizard and the WhatsApp sign-in field are removed.
- **After Google**: the account is created, a channel (A or B) is assigned automatically, and the member lands directly in `/dashboard` — no welcome reveal, no onboarding form.
- **Name**: taken from the Google account, so nothing is asked.

## Technical changes

- `src/routes/register.tsx` — reduce to a Google-only card (keep branding/copy); drop the step wizard, WhatsApp→email/password derivation, and the `completeOnboarding` call.
- `src/routes/auth.tsx` — remove the WhatsApp input and password sign-in; keep only Google plus the expired-session toast.
- `src/routes/auth.callback.tsx` — after the session is confirmed, navigate to `/dashboard` instead of `/welcome`.
- `src/lib/profile.functions.ts` — `getOrCreateMyProfile` no longer returns `needsOnboarding`; if no profile row exists it creates one from Google metadata (name, empty whatsapp) with a random channel and the `user` role. Delete `completeOnboarding`.
- Delete `src/routes/_authenticated/onboarding.tsx` and `src/routes/_authenticated/welcome.tsx`; remove links/redirects to them (dashboard and route guards).
- Auth config: enable the Google provider and disable email/password sign-in so the legacy `wa_*@aurum.members` path can't be used.
- Database is untouched: `profiles.whatsapp` stays as a column (blank for new members), and the existing signup trigger already creates the profile + role row.

## Note

Existing members who registered with a WhatsApp number will no longer be able to sign in with it — they will need to sign in with Google, which creates a fresh account and channel. Say the word if you'd rather keep the old WhatsApp sign-in available for them.
