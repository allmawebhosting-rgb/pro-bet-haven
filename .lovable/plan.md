# Premium Sports Predictions Platform

A luxury black/gold/white subscription platform for football predictions with random channel assignment, admin management, and a full backend on Lovable Cloud.

Note on stack: your brief mentions Next.js, but this project runs on TanStack Start (React 19 + TypeScript + Tailwind v4 + Framer Motion). All requested functionality is fully supported — I'll build on this stack rather than switching frameworks.

## Design System

- Palette: deep black background (`oklch(0.08 0 0)`), gold accent (`oklch(0.78 0.14 85)`), soft white text, subtle gold gradients
- Typography: Cormorant Garamond (display) + Inter (body) for a luxury fintech feel
- Glassmorphism cards (`backdrop-blur-xl` + gold borders), soft shadows, rounded-2xl
- Framer Motion for scroll reveals, page transitions, countdown pulses, skeleton loaders
- Mobile-first, responsive across all breakpoints

## Public Site

- **Landing (`/`)**: full-screen hero with stadium background image (generated), headline "Premium Sports Predictions", animated stat counters, sticky glass nav, CTA to register, testimonials carousel, FAQ accordion, footer with socials/contact
- **Register (`/register`)**: name + WhatsApp only → creates auth user (email synthesized from WhatsApp, random password stored) → assigns Channel A or B via 50/50 random → redirect to `/channel`
- **Login (`/login`)**: WhatsApp + password (auto-issued token flow via magic link fallback)

## User Area (auth-gated `_authenticated/`)

- **`/channel`**: resolves user's assigned channel and renders its prediction page — user never sees channel selector
- **`/dashboard`**: welcome, next-release countdown, featured match, prediction history table, performance stats (win-rate donut, streak, ROI-style chart), sidebar nav
- Predictions display: match, league, date/kickoff, teams, pick, odds, confidence bar, "for informational purposes" disclaimer
- Announcements bell showing broadcasts targeted to their channel or all

## Admin Panel (`/admin`, role-gated)

- Login via same auth, gated by `admin` role in `user_roles`
- Predictions CRUD per channel with publish/hide, scheduled release datetime
- Countdown timer configuration per channel
- Users table: search by name/WhatsApp, view channel, reassign, enable/disable
- Announcements composer: all / Channel A / Channel B
- Analytics: registrations over time, channel split, active users
- Site settings: website name, logo URL, primary/accent colors, tagline — stored in `site_settings` table and consumed sitewide

## Backend (Lovable Cloud)

Tables:
- `profiles` (id → auth.users, full_name, whatsapp, channel 'A'|'B', status 'active'|'disabled', last_login, created_at)
- `user_roles` (user_id, role enum: admin|user) + `has_role()` security-definer fn
- `predictions` (id, channel, match_name, league, home_team, away_team, kickoff_at, prediction, odds, confidence 1-5, published bool, release_at, created_at)
- `channel_settings` (channel PK, next_release_at, release_interval_minutes)
- `announcements` (id, target 'all'|'A'|'B', title, body, created_at)
- `site_settings` (singleton: site_name, logo_url, primary_color, accent_color, tagline)

RLS:
- Users read only their own profile, predictions where `channel = their channel AND published = true AND release_at <= now()`, announcements for their channel or all
- Admins (via `has_role`) full access
- Trigger on `auth.users` insert → create profile with random channel

## Technical Details

- TanStack Router file routes; `_authenticated/` gate managed by Supabase integration
- Server functions (`createServerFn`) for admin mutations, user reassignment, announcement broadcast
- Realtime subscription on `announcements` + `predictions` for live updates
- Countdown component driven by `channel_settings.next_release_at`
- Site settings loaded in `__root.tsx` via server fn + React Query, applied as CSS variables so admin color changes propagate live
- SEO: per-route `head()` with unique titles/descriptions; sitemap.xml + robots.txt
- Framer Motion page transitions in `__root`
- All colors as semantic tokens in `src/styles.css` — no hardcoded hex in components

## Delivery Order

1. Enable Lovable Cloud + migration (tables, RLS, roles, trigger, seed admin role helper)
2. Design system (styles.css, fonts, glass utilities) + shared layout primitives
3. Landing page + hero image generation
4. Auth (register/login) + channel assignment
5. User dashboard + channel prediction page + countdown
6. Admin panel (predictions, users, announcements, site settings)
7. Realtime notifications + SEO polish + sitemap
