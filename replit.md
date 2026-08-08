# Aurum Fixed

## Project overview

Aurum Fixed is a TanStack Start and React sports-predictions membership app backed by Supabase. The app uses Google OAuth, assigns authenticated members to a private channel, and serves the channel feed from Supabase.

## Running on Replit

- Runtime: Node.js 22+
- Install dependencies: `npm install`
- Start the preview workflow: `npm run dev -- --host 0.0.0.0 --port 5000`
- Build for production: `npm run build`

The Supabase URL and publishable key are required in the environment. Google OAuth must also be configured for the deployed app's `/auth/callback` URL.