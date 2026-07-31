# Fix: the sign-in screen comes back after you sign in

## What you're seeing

You enter your WhatsApp number, tap **Sign in**, and instead of landing in your channel you get the "Welcome back" sign-in card a second time.

## What I've confirmed in the code

There is exactly one place in the app that can send a signed-in user back to the sign-in card: the guard that wraps every private page (`/dashboard`, `/welcome`, `/onboarding`, `/admin`). It checks for a stored session and, if it doesn't find one — or if the backend answers 401/403 — it redirects to `/auth`.

Sign-in navigates to `/dashboard` immediately after the password call returns. If the session hasn't finished being written to browser storage at that exact moment, the guard sees "no session" and bounces straight back. That's the most likely cause, but I have not yet reproduced it live, so I'll confirm it before claiming it fixed rather than guessing.

## Plan

1. **Reproduce it first.** Drive a real sign-in in a headless browser and log what the guard sees (session present or not, and any 401 from the backend). This tells us whether it's the timing race above or an expired/rejected session.
2. **Fix the confirmed cause.** If it's the race: don't navigate until the session is actually readable (the app already has a `waitForSession` helper for exactly this — sign-in calls it only as a fallback today, it should gate the navigation instead), and let the guard wait briefly for a session that's mid-write rather than redirecting on the first empty read.
3. **Make the bounce visible instead of silent.** If the guard genuinely has no session, land on the sign-in card with a short message ("Your session expired, please sign in again") so it never looks like the button did nothing.
4. **Re-test end to end**: sign in with an existing number → welcome/channel → dashboard, plus a hard refresh on the dashboard to make sure the guard doesn't bounce on reload either.

## Technical notes

- `src/routes/auth.tsx`: await `waitForSession()` unconditionally before `navigate({ to: "/dashboard", replace: true })`; surface a toast if it never resolves.
- `src/routes/_authenticated/route.tsx`: in `beforeLoad`, replace the single `getSession()` read with a short bounded wait before the redirect; keep the existing "only bounce on explicit 401/403" behaviour for `getUser()`.
- Redirects to `/auth` carry a reason flag so the sign-in page can explain itself.
- No database, schema, or auth-provider changes.
