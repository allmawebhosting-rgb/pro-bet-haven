# Premium polish for the channel feed

Refine the members' channel (`/dashboard`) so it reads as a quiet, high-end private feed: same Telegram-style structure, less noise, better typography and spacing.

## Remove

- **Fake locked teaser posts** — the three blurred `██████ vs ██████` bubbles injected for non-VIP members disappear entirely. The VIP upgrade post at the bottom of the feed stays as the single upgrade prompt.
- **Emoji and badge clutter** — drop the 🔒 emoji from the "Fixed" chip, drop the Flame "Lock" badge, and reduce each message to at most one accent chip plus a subtle "New" dot instead of a boxed badge.
- **Duplicated countdown** — the pinned bar currently shows a countdown and the hero card shows another. The pinned bar keeps a single compact countdown; the hero "Next match" card keeps the large one only when it is a different event, otherwise the pinned bar alone carries it.

## Refine

- **Header**: thinner (56px), one line of metadata, muted verified mark, VIP/Free pill made smaller and quieter. Remove the green "online" dot.
- **Pinned bar**: hairline gold rule instead of the gradient wash, monospace countdown right-aligned, tighter vertical rhythm.
- **Message cards**: single card treatment with a soft inner highlight, larger serif match title, generous 16px inner padding, consistent 12px gap between messages, and metadata reduced to time only (view counts stay or go with your call — plan keeps them since they weren't flagged).
- **Prediction block**: becomes the focal element — gold hairline frame, larger prediction line, odds and confidence dots on one restrained row.
- **Next-match hero**: calmer background, countdown digits in a lighter weight with wider tracking, league name as a small caps eyebrow.
- **Unread divider / date chips**: thinner rules, smaller caps, less gold saturation.
- **Empty state**: replace the speaker icon block with a centered serif line plus a hairline rule.

## Technical notes

- All work stays in `src/routes/_authenticated/dashboard.tsx` (feed, header, bubbles, chips) with small token additions in `src/styles.css` if a new hairline/elevation utility is needed.
- Remove the `locked` feed branch and the `LockedBubble` component; drop now-unused icon imports (`Flame`, `Volume2`, `Trophy` export shim).
- No data model, server function, or query changes — presentation only.
