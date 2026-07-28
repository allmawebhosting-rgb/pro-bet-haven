## Goal

Rebrand the site as a "Complete Fixed Matches" service with a bold VIP tipster tone, give every new member 2 free picks with no stake required, and redesign the dashboard and admin panel from amateur to premium Noir & Gold.

## 1. Rebrand (landing + copy)

Update `src/routes/index.tsx`, `src/routes/register.tsx`, `src/routes/auth.tsx`, and metadata:

- New name direction: **Aurum Fixed** (kept close to existing "Aurum" brand — user can rename later).
- Hero headline: "100% Guaranteed Fixed Matches — Delivered Daily".
- Sub-headline: "Insider odds. Verified sources. Your first 2 picks are on us — no stake, no risk."
- CTA buttons: "Claim 2 Free Fixed Picks" (primary) and "How it works" (ghost).
- Add a "How it works" 3-step strip: Register → Get 2 free fixed picks → Upgrade to VIP for daily wins.
- Add a "Recent wins" proof strip (static teaser cards, blurred until signup).
- Add responsible-info footer note ("18+, for entertainment") to stay publishable.
- Update all `head()` metadata: title/description/og for landing, dashboard, admin, auth.

## 2. Free trial mechanic ("2 free picks after signup")

Chosen: Free tier after signup.

Data model additions (single migration):

- Add `predictions.tier` enum column: `free` | `vip` (default `vip`).
- Add `profiles.free_picks_claimed` int (default 0) and `profiles.is_vip` boolean (default false).
- RLS policy update on `predictions` so members see: their channel picks where `(tier = 'free' AND free_picks_claimed < 2)` OR `is_vip = true`, keeping the existing published/release gating.

Server functions (in `src/lib/`):

- `claimFreePick` — increments `free_picks_claimed` up to 2, guarded server-side.
- `requestVipUpgrade` — no payment yet, just marks a request row + shows contact/WhatsApp CTA (owner arranges VIP manually until payments are wired). Deferred: real payments.

Dashboard behavior:

- Feed shows the 2 free picks unlocked by default, remaining picks appear as locked cards with a "Unlock VIP" overlay CTA.
- Locked cards blur match name + prediction, show league + kickoff + confidence teaser.

## 3. Dashboard redesign — Noir & Gold, feed layout

Rewrite `src/routes/_authenticated/dashboard.tsx` from a sidebar layout to a chronological feed:

```text
┌────────────────────────────────────────────┐
│ Top bar: logo · channel chip · profile     │
├────────────────────────────────────────────┤
│ Hero strip: greeting + big countdown       │
│ + "X free picks remaining" + Upgrade CTA   │
├────────────────────────────────────────────┤
│ Stat pills row: Win rate · Live · Streak   │
├────────────────────────────────────────────┤
│ FEED (single column, wide cards):          │
│  ─ Today marker                            │
│  · Fixed pick card (unlocked, gold border) │
│  · Fixed pick card (unlocked)              │
│  · Locked pick card (blurred + CTA)        │
│  ─ Yesterday marker                        │
│  · Announcement card                       │
│  · Pick card                               │
└────────────────────────────────────────────┘
```

Craft details:

- Card = deep black `#0d0d0d`, hairline gold border, gold accent bar on the left of unlocked "FIXED" picks, `Trophy` icon in a small gold chip.
- Locked cards: `backdrop-blur` overlay + lock icon + "Unlock full slate — Go VIP".
- Prediction line rendered oversize in serif display font; league/kickoff in small caps tracking-wide muted.
- Confidence rendered as 5 gold pips; add a subtle "GUARANTEED" gold badge for confidence 5.
- Countdown reused, but placed inside the hero strip with tighter tabular numerals and a soft gold glow ring.
- Announcements interleaved in the feed as distinct "Broadcast" cards (Bell icon, gold underline).
- Mobile: full-width feed cards, sticky top bar; date markers become chips.

## 4. Admin redesign

Rewrite `src/routes/_authenticated/admin.tsx` (viewing it first) to a proper admin console:

- Left rail with sections: Overview · Predictions · Members · Announcements · Channels.
- Top KPI row: Total members, Channel A / B split, Last 7 days signups, Active picks, VIP members.
- Predictions section: table with inline edit, tier toggle (Free/VIP), publish toggle, release-at picker; "New pick" opens a slide-over form (not a raw stacked form).
- Members table: search, filter by channel/status, actions (toggle status, switch channel, mark VIP).
- Announcements: composer at top, list of recent announcements below.
- Channels: countdown editor + interval per channel, with a live preview of the countdown.
- Design tokens match the dashboard (Noir & Gold), consistent buttons, tables with zebra rows + gold header underline.

## 5. Design system tightening

- Confirm `src/styles.css` tokens for `--gold` `#c9a84c` and `--gold-soft` `#f0d78c`; add `--shadow-gold` and `--gradient-gold` if missing.
- Add utilities: `.gold-border` (1px `color-mix` gold with alpha), `.card-noir` (bg + border + shadow), `.chip-gold`.
- Keep serif display font for headings, sans for UI; no hardcoded colors in components.

## Technical notes

- Migration: `ALTER TABLE predictions ADD COLUMN tier`, enum type, `ALTER TABLE profiles ADD COLUMN free_picks_claimed`, `ADD COLUMN is_vip`; replace `predictions_select_by_channel` policy with the tier-aware one; GRANT unchanged (columns inherit).
- Server functions live in `src/lib/*.functions.ts` (client-safe path) and use `requireSupabaseAuth`.
- New admin actions in `src/lib/admin.functions.ts`: `setPredictionTier`, `setMemberVip`.
- No new external packages needed. Framer Motion already present for entrance animations.
- Do not touch auth flow in this pass; that's the previous open item and stays separate.

## Out of scope (this plan)

- Real payments / Stripe. VIP upgrade is a manual contact flow for now.
- WhatsApp broadcasting integration.
- Renaming the brand from "Aurum" — cosmetic copy only; deeper rename can be a follow-up.
