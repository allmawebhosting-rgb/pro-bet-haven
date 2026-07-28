## Problem

The app has two sign-in paths and both can dead-end before the dashboard:

1. **WhatsApp registration** creates an account with a synthetic email (`wa_<digits>@aurum.members`). If the backend requires email confirmation, `signUp` returns **no session**, so the redirect to `/dashboard` bounces straight back to `/auth`. The confirmation email can never arrive either — the domain isn't real. This matches "I can't even see the inside of the project".
2. **Google button** calls the managed OAuth helper, but the Google provider must be switched on in the backend or every attempt fails with "Unsupported provider".

Neither cause is confirmed yet from live behavior, so step 1 of the work is verifying which one is firing.

## Plan

1. **Verify** — reproduce a registration and a Google sign-in in the running app, capture the exact error and whether a session is created.
2. **Enable auto-confirm for signups** so WhatsApp-based accounts get an immediate session (the synthetic email address can never receive a confirmation link, so confirmation must be off for this design).
3. **Turn on the Google provider** with the managed credentials in the same change, so the Google button works.
4. **Harden the register flow**: after `signUp`, if no session came back, explicitly sign in with the derived password before navigating; surface the real error message instead of a generic "Registration failed".
5. **Harden the login flow**: keep the friendly "no account found" message only for invalid-credential errors; show the actual message for anything else (rate limits, provider disabled) so failures are diagnosable.
6. **Fix the callback fallback**: `/auth/callback` currently leaks its subscription cleanup inside a promise; make it clean up properly and send the user back to `/auth` with an error toast after the timeout instead of stranding them on a dead screen.
7. **Re-test end to end**: register a new number → land on dashboard; sign out → sign back in; Google sign-in → onboarding → dashboard.

## Technical notes

- Auth settings change via the backend auth configuration (auto-confirm email on, signups enabled) plus enabling the managed Google provider.
- No database migration is needed; the profile/role rows are already created by the `handle_new_user` trigger and the `getOrCreateMyProfile` server function.
- The `_authenticated` gate stays as-is; it is behaving correctly by redirecting sessionless users.
