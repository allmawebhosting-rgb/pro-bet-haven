# Use `allma2580` as the admin access code

The first-admin bootstrap currently accepts the code `aurum-founder`. Change it to `allma2580`.

## What changes

- The admin page's setup form accepts `allma2580` as the founder code.
- The hint text on that page shows the new code instead of the old one.

## Technical changes

- `src/lib/admin.functions.ts` — in `grantAdminSelf`, compare the submitted secret against `allma2580`.
- `src/routes/_authenticated/admin.tsx` — update the displayed default code text.

## Notes

- No admin account exists yet, so the bootstrap is still open: sign in, open `/admin`, enter `allma2580`, and you become the first admin. After that the bootstrap closes automatically.
- The code is visible in the page hint. If you'd rather it not be shown on screen, say so and I'll remove that line.
