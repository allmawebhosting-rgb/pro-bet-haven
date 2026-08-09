# Picks you post show up, and any sport is supported

Two problems, confirmed against the live data.

## 1. Posted picks seem to vanish

The feed's visibility rule hides a pick unless **all** of these are true: it's published, its release time has passed, it's in the viewer's channel, and — for VIP picks — the viewer is marked VIP.

Right now no account in the database is marked VIP (all 5 profiles have VIP off), and the composer posts VIP by default. So every match you create is instantly invisible to you and to everyone else. Free picks also stay hidden until the channel's scheduled drop time, which looks like "it didn't post".

Fixes:

- Admins always see every pick in the feed, regardless of tier, channel, or release time, with a small "VIP" / "scheduled for <time>" marker so it's clear what members currently see.
- After posting, show a confirmation that says exactly what happened: "Posted to Channel A — VIP members only" or "Posted to Channel B — drops at 07:35".
- Add a VIP toggle for members in the admin users list, so real members can actually see VIP picks (the underlying capability exists; it just needs to be reachable and used).

## 2. Not football only

Picks are currently football-shaped: a league text box and home/away teams.

- Add a **sport** to each pick: Football, Basketball, Tennis, Ice Hockey, Baseball, Cricket, Rugby, Boxing/MMA, eSports, Other.
- The composer gets a sport selector, and the two team fields are relabelled per sport (Home/Away for team sports, Player 1/Player 2 for tennis and combat sports).
- Every pick card shows a sport badge next to the league, and the feed gets sport filter chips so members can narrow to one sport.
- Existing picks are set to Football so nothing looks broken.

## Technical notes

- Migration: add a `sport` column to `predictions` (text with a default of `football`, constrained to the list above), backfill existing rows, and add an admin-visibility branch to the predictions read policy via `has_role(auth.uid(), 'admin')`.
- `postMatchPick` / `upsertPredictionAdmin` accept and validate `sport`; the free-pick shared drop-time rule stays unchanged.
- UI: `AdminComposer` sport selector + dynamic field labels, dashboard pick cards render the badge, feed adds sport filters, admin users tab gains the VIP toggle.
