# Members see every pick — VIP ones shown locked

Right now your only posted pick is a VIP pick, and none of your five members are marked VIP, so the visibility rule hides it from all of them. Free picks are also held back until the channel's scheduled drop time.

## What changes

- Every member sees **all picks in their own channel** as soon as you post them — no waiting for a drop time.
- **VIP picks appear as locked cards**: teams, sport, league and start time are visible, but the actual tip, odds and confidence are hidden behind the existing "VIP pick locked" treatment, with an upgrade prompt.
- Non-VIP members can never retrieve the hidden tip text, even outside the app — the tip is stripped before it ever leaves the server.
- Admins keep full visibility exactly as today.

## Technical notes

- Migration: replace the `predictions_select_by_channel` policy so authenticated members can read published picks in their channel regardless of tier or `release_at`; admins keep the full-visibility branch.
- Because the row itself becomes readable, VIP tip fields must not be exposed: add a `getChannelPicks` authenticated server function that fetches the caller's channel picks and blanks `prediction`, `odds` and `confidence` on VIP rows when the caller is neither VIP nor admin, returning a `locked: true` flag instead.
- Dashboard swaps its direct `supabase.from("predictions")` query for that server function (realtime subscription kept, just refetching the new query). Card rendering already supports a `locked` state — it now keys off the server flag.
- Free picks post with an immediate release time; the channel drop-time scheduling in `postMatchPick` / `updateChannelSettingsAdmin` is no longer applied to visibility, and the countdown block on the dashboard is dropped for members.
