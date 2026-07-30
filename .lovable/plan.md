## Goal

1. Members never learn they were split into two channels — they just see "their" private channel.
2. No auto-zoom on mobile when tapping inputs/textareas.

## 1. Remove all A/B disclosure (user-facing only)

The backend split stays exactly as is (`profiles.channel`, targeting, settings). Only the presentation changes.

Dashboard (`src/routes/_authenticated/dashboard.tsx`):
- Replace the per-letter `CHANNEL_META` map with one neutral identity: name "Aurum Fixed · VIP Signals", a gold monogram (crest/"A" logo mark, not the channel letter), one subscriber count.
- Avatar shows the brand mark instead of the "A"/"B" letter (`MessageShell`, header).
- Pinned bar: drop "· Channel {letter}" — just "Every N min".
- Welcome tour: "Welcome to your private channel" instead of "Welcome to Channel A".
- Keep `channelLetter` props internally only if needed for data, but render nothing from them.

Welcome interstitial (`src/routes/_authenticated/welcome.tsx`):
- Rework from "Assigning your channel / two private circles / A vs B flicker / You're in Channel B" into a neutral "Preparing your private channel" → "You're in" reveal with the brand crest, keeping the same cinematic gold animation and the "2 free picks unlocked" card.

Register/onboarding/landing copy: already says "your private channel" with no letters — leave as is.

Admin side keeps the full Channel A / Channel B / Both targeting in the composer and admin console (admins should still see the split).

## 2. Fix mobile auto-zoom

iOS Safari zooms whenever a focused field's font-size is under 16px. Several fields use `text-sm` (14px) — composer textarea, match form inputs, auth/register/onboarding fields.

- Add a global rule in `src/styles.css`: on coarse-pointer / max-width 767px, force `input, textarea, select` to `font-size: 16px` (visual size unchanged elsewhere).
- Add `maximum-scale=1, viewport-fit=cover` to the viewport meta in `src/routes/__root.tsx` as a belt-and-braces guard (pinch-zoom on content stays available on Android; iOS respects the font-size fix).

## Technical notes

Frontend/presentation only — no migration, no server function changes, no change to how users are actually assigned.
