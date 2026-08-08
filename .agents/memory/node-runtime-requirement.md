---
name: Node runtime requirement
description: Runtime compatibility constraint for the TanStack Start and Supabase dependency set.
---

The app requires Node.js 22.12 or newer because the current TanStack Start and Supabase packages rely on native WebSocket support that is unavailable in the project’s former Node 20 runtime.

**Why:** Under Node 20, the root route crashed before rendering and the preview appeared blank with a native WebSocket error.

**How to apply:** Keep the Replit module and package engine aligned with Node 22+ when starting, building, or changing the app’s dependency set.