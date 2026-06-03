# Supabase setup

The app keeps using localStorage as the source of truth for snappy offline
work, but if you sign in it will sync your data (`projects`, `history`,
`settings`, `mood`) to a Supabase Postgres row keyed by your user id, so
the same cards follow you across devices.

## 1. Create the Supabase project

1. Go to <https://supabase.com> and create a new project.
2. Project Settings → API → copy:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon` `public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. Paste both into `.env.local` (see `.env.example`).

## 2. Run the schema migration

In the Supabase SQL editor paste the contents of [`schema.sql`](./schema.sql)
and run it once. It creates a single `public.user_state` table with row-level
security so each user can only read/write their own row.

## 3. Enable the Google auth provider

In Supabase: **Authentication → Providers → Google**.

1. Toggle **Enabled**.
2. In Google Cloud Console (<https://console.cloud.google.com/apis/credentials>):
   - Create an OAuth client (if you don't already have one for this app).
   - Copy the **client ID** and **client secret** into the Supabase form.
   - Add the Supabase **callback URL** (shown on that same Supabase screen,
     looks like `https://<your-ref>.supabase.co/auth/v1/callback`) as an
     **Authorized redirect URI** in the Google client.
3. Click Save.

## 4. URL configuration

In Supabase: **Authentication → URL Configuration**.

- **Site URL**: your production URL (e.g. `https://post-int.app`).
- **Redirect URLs**: add both
  - `http://localhost:3000/auth/callback`
  - `https://<your-deploy>/auth/callback`

This lets the app finish the OAuth handshake on both local and prod.

## 5. Done

Restart `npm run dev`. The Nav will now offer "Link account" — clicking it
runs Supabase's Google sign-in. After login the sync hook will:

- pull the remote row (if newer) and merge into localStorage; or
- push localStorage up (if newer or no remote row exists yet).

Local changes are pushed with a ~1.5 s debounce, and the app polls every
15 s for remote changes so other devices' edits land within ~15 s.

## Notes

- The old `/api/auth/google/*` routes still exist — they're used by the
  Calendar / Drive integrations. Supabase Auth handles only **identity**;
  Google API access tokens for calendar still flow through those routes.
- If you ever want to wipe a user's cloud state, just delete their row in
  `public.user_state` — they'll re-upload on next sync.
