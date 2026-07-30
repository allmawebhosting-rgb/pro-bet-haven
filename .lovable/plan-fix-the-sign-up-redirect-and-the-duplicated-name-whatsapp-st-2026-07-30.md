# Fix the sign-up redirect and the duplicated name/WhatsApp step

## What's wrong

**The form appears twice (confirmed in code).** Registration collects Full name + WhatsApp across three steps, then sends the user to `/welcome`. `/welcome` asks the backend for the member profile — and that call only creates a profile when it can read a WhatsApp number from the account's sign-up metadata. Whenever it can't (Google sign-in, or any sign-up where the account was created without that metadata attached), it reports "needs onboarding" and pushes the user to `/onboarding`, which is the *same* Full name + WhatsApp form again. Nothing from the registration steps is carried over, so the user retypes it.

**The blank page after sign-up.** `/welcome` shows an "assigning your channel" card while it loads, and has no handling for a failed profile call — if the profile request errors or the session isn't attached yet, the page just sits there with nothing meaningful and the user never reaches the dashboard. There is also a second likely trigger that needs one check before it's stated as fact: accounts are created with synthetic emails (`wa_<digits>@aurum.members`) which can never receive a confirmation email. If email confirmation is required on the backend, sign-up returns no session at all and the redirect can't complete. I'll verify the auth setting first and enable auto-confirm for email sign-ups if it's off — otherwise WhatsApp registration can never work.

## The fix

1. **Create the profile at registration time.** After the account is created and the session is live, registration saves the name and WhatsApp it already collected, then goes to `/welcome`. The profile now exists, so the onboarding form is never triggered for WhatsApp sign-ups.
2. **Keep `/onboarding` only for Google sign-in** (where there genuinely is no WhatsApp number), and prefill the name from the Google account.
3. **Make `/welcome` robust:** proper loading, error, and retry states instead of a stuck/blank screen, and only redirect to onboarding once the profile call has actually returned.
4. **Verify the auth setting** for email confirmation and turn on auto-confirm for email sign-ups if needed, since these addresses are internal identifiers, not real inboxes.
5. **Test end to end**: register with a fresh number → land on the welcome/channel reveal → enter dashboard, with no repeated form.

## Technical notes

- `src/routes/register.tsx`: after `signUp` + session settle, call `completeOnboarding` with `{ full_name, whatsapp }`, invalidate the `["profile"]` query, then `navigate({ to: "/welcome", replace: true })`. Surface a clear message if the session never materialises rather than navigating blindly.
- `src/lib/profile.functions.ts`: `getOrCreateMyProfile` keeps its metadata fallback; no schema change required.
- `src/routes/_authenticated/welcome.tsx`: handle `q.isPending` / `q.isError` explicitly; gate the onboarding redirect on `q.isSuccess`.
- `src/routes/_authenticated/onboarding.tsx`: prefill `whatsapp` from user metadata when present.
- Auth config: `auto_confirm_email` enabled for the synthetic-email sign-up flow.
