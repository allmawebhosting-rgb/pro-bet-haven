## Goal

Members can request a VIP upgrade, ask to buy the next game, or send a free-form message from inside the app. Those land in a new **Requests** tab on the admin page, where the admin can reply — and the member sees the reply back in their dashboard.

## Database

Two new tables (with grants + RLS):

- `member_requests` — `user_id`, `kind` (`upgrade` | `next_game` | `general`), `subject`, `status` (`open` | `answered` | `closed`), `last_message_at`, timestamps.
- `request_messages` — `request_id`, `sender_id`, `sender_role` (`member` | `admin`), `body`, `created_at`.

Access rules in plain English:
- A member can create a request and read/write messages only on their own requests.
- Admins can read every request and every message, reply, and change a request's status.
- Nobody else can see anything.

## Member side (dashboard)

- Replace the WhatsApp link on the VIP CTA with a "Request VIP upgrade" button that opens a small composer (pre-filled subject, optional note).
- Add a "Request this game" action on locked/upcoming picks, sending a `next_game` request that references the match.
- Add a compact **Messages** panel on the dashboard listing the member's requests with unread/answered state; opening one shows the thread and lets them reply.

## Admin side

- New `requests` tab in `src/routes/_authenticated/admin.tsx`, alongside the existing tabs.
- Left: list of requests with member name, WhatsApp, kind badge, status, and last activity; filter by status/kind.
- Right: the message thread with a reply box. Admin actions on a thread: reply, mark answered/closed, and a one-click **Grant VIP** for `upgrade` requests (reuses the existing VIP toggle).
- Show an unread count badge on the Requests tab.

## Technical notes

- New `src/lib/requests.functions.ts` with authenticated server functions: `createRequest`, `listMyRequests`, `listRequestMessages`, `postMessage` (member scope), plus admin-scoped `listRequestsAdmin`, `replyRequestAdmin`, `setRequestStatusAdmin` — following the existing `assertAdmin` pattern in `src/lib/admin.functions.ts`.
- Message body validated with length limits before insert.
- Polling refresh via TanStack Query (no realtime) to keep it simple; can be upgraded later.
