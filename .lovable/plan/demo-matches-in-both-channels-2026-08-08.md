# Demo matches in both channels

Fill Channel A and Channel B with realistic sample picks so the member feed looks alive instead of nearly empty.

## Current state

- Only 2 picks exist, both in Channel A (1 free, 1 VIP). Channel B is empty.
- The channel drop-time settings table has no rows, so free picks have no shared release time.

## What gets added

Per channel (A and B):

- **2 free picks** — released together as one bundle at that channel's drop time (matches the existing free-bundle rule).
- **3 VIP picks** — published and visible immediately to VIP members.

Each demo pick has a league, home/away teams, a kickoff time in the next 1-3 days, a prediction (e.g. "Over 2.5 Goals", "Home Win", "BTTS"), odds, and a confidence rating.

Also adds the missing drop-time rows for Channel A and Channel B (next release a few hours out, 24h interval) so the countdown and free bundle work.

## Technical notes

- Data-only change: inserts into `channel_settings` and `predictions`. No schema or code changes.
- Free rows use the channel's `next_release_at`; VIP rows release now.
- Existing 2 picks in Channel A are left in place.
