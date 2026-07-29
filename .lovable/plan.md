# Premium Channels, Inline Admin Composer, and Onboarding Redesign

## 1. Premium channel design (dashboard)

Elevate the Telegram-style feed into a signature Aurum surface:

- **Channel header**: replace flat bar with a layered gold-foil header — deep charcoal gradient, subtle grain, embossed monogram avatar (gold-plated ring with inner black core), verified check as a gold seal, channel name in Cormorant/Instrument Serif display, subscriber count + "Private • Fixed Picks" chip in fine caps. Sticky on scroll with a translucent glass blur.
- **Pinned bar**: dedicated pinned message slot below the header (gold hairline border, pin icon, next release countdown when active).
- **Message bubbles**: 
  - Text broadcasts → dark card with soft inner glow, gold accent line on the left, timestamp + view count + a subtle "eyes" icon.
  - Fixed match picks → premium card variant with league chip, teams row, kickoff, pick, odds pill, confidence dots (gold), and a "FIXED" gold foil badge for VIP tier.
  - Media messages → framed image with gold hairline and caption below.
  - Locked/VIP → blurred bubble with a gold padlock and "Unlock VIP" inline CTA.
- **Date separators**: centered gold hairline with small caps chip ("Today", "Yesterday", date).
- **System messages**: centered subtle chip (welcome, "You're subscribed to Channel A", "2 free picks unlocked").
- **Motion**: bubbles fade+slide in on mount; new incoming message pulses gold briefly.

## 2. Inline admin composer (bottom of channel)

Admins (via `has_role`) see a fixed composer docked at the bottom of the channel:

- Telegram-style layout: `+` attach menu on the left, textarea in the middle, gold send button on the right.
- **Attach menu**: Fixed match pick, Image, Pin toggle.
  - Selecting "Fixed match pick" swaps the composer into a compact match form (teams, league, kickoff, pick, odds, confidence, tier free/VIP) with a "Back to text" chevron.
  - "Image" opens file picker → uploads to a new `channel-media` storage bucket → attaches URL preview above textarea.
  - "Pin toggle" marks the outgoing message as pinned (replaces current pinned).
- **Target selector**: small chip above composer ("Post to: This channel / Both channels") defaulting to the channel currently viewed.
- Non-admins never see the composer.
- Send calls a new server fn that routes to `announcements` (text/image) or `predictions` (match pick) based on type.

## 3. Multi-step onboarding

Replace the single-form `/register` with a polished 3-step flow (progress dots at top, gold accent on active step):

1. **Step 1 — Name**: Full name field, "Continue" button, Google option below divider.
2. **Step 2 — WhatsApp**: phone input with country code hint, why-we-need-it microcopy.
3. **Step 3 — Confirm**: review card + terms mini-copy + "Enter Aurum" button.

Framer Motion slide transitions between steps, back arrow, keyboard Enter advances.

**Channel reveal**: after successful signup (or Google onboarding completion), route to a full-screen `/welcome` interstitial:

- Dark stage, spotlight beam, animated "Assigning your channel..." with rotating A/B letters.
- Gold envelope opens revealing "Channel A" (or B) with the monogram and a "2 free picks unlocked" line.
- "Enter Channel" gold button → dashboard.

**Welcome tour** (first-time only, tracked via a `profiles.tour_completed` flag): 3 lightweight coach-mark tooltips over the dashboard — pinned bar, feed, VIP lock — with Skip/Next. Dismisses and sets flag.

The existing `/onboarding` (Google WhatsApp capture) gets the same premium visual language and feeds into the channel reveal.

## Technical details

**Database migration**:
- Add `announcements.image_url text`, `announcements.pinned boolean default false`, `announcements.author_id uuid`, `announcements.channel channel_code null` (nullable = broadcast to all).
- Add `announcements` INSERT policy for admins only via `has_role(auth.uid(),'admin')`.
- Add `profiles.tour_completed boolean not null default false`.
- Create `channel-media` public storage bucket via the storage tool with an INSERT policy limited to admins on `storage.objects`.
- Add `predictions` INSERT policy for admins so inline match-pick posts work through the authenticated client (currently admin fns use service role, which will keep working).

**Server functions** (`src/lib/channel.functions.ts`):
- `postAnnouncement({ body, image_url?, pinned?, target })` — admin-gated, inserts into `announcements`; if `pinned`, unsets other pinned rows in that channel first.
- `postMatchPick({ ...fields, target, tier })` — admin-gated, inserts into `predictions` with `published=true, release_at=now()`.
- `markTourCompleted()` — updates `profiles.tour_completed`.
- All use `has_role` check via `context.supabase.rpc('has_role', ...)`; admin writes bypass RLS via `supabaseAdmin` after auth check.

**Client work**:
- `src/routes/_authenticated/dashboard.tsx` — restructure feed with new bubble variants, pinned slot, admin composer at bottom (sticky), tour overlay.
- New `src/components/channel/*`: `ChannelHeader`, `MessageBubble` (variants: text, match, media, locked, system), `DateSeparator`, `PinnedBar`, `AdminComposer`, `MatchPickForm`, `ChannelRevealStage`, `WelcomeTour`.
- New `src/routes/register.tsx` — refactor into stepper with Framer Motion.
- New `src/routes/_authenticated/welcome.tsx` — channel reveal.
- Update `src/routes/_authenticated/onboarding.tsx` — match new visual language, redirect to `/welcome` after complete.
- Update `src/routes/auth.callback.tsx` — after profile create, redirect to `/welcome` on first login.
- Styling: extend `src/styles.css` tokens (gold-foil gradient, inner-glow shadow, grain layer) and utilities.

**Out of scope**: payments, message editing/deletion (admin can still manage from `/admin`), reactions, replies, realtime subscriptions (rely on existing query invalidation + a 20s poll on the feed).

Proceed?
