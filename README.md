# Post-In't

A draggable, post-it-style project management board with an LLM that auto-tags task difficulty, a daily/weekly stats dashboard, a "task roulette" mode for choice paralysis, and public share-links for any post-it.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Ffsanchezux%2Fpost-int&env=GROQ_API_KEY,GOOGLE_CLIENT_ID,GOOGLE_CLIENT_SECRET,UPSTASH_REDIS_REST_URL,UPSTASH_REDIS_REST_TOKEN&envDescription=All%20optional%20%E2%80%94%20see%20.env.example&envLink=https%3A%2F%2Fgithub.com%2Ffsanchezux%2Fpost-int%2Fblob%2Fmain%2F.env.example)

> Built with Next.js 15 (App Router) + React 19 + TypeScript + Tailwind. All required functionality works with **zero configuration** — every external integration is optional and degrades gracefully.

---

## Features

- **Board**: drag-and-drop post-its on a dotted whiteboard. Per-post-it color (4-color palette), description toggle, up to 3 named links, progress toggle, importance.
- **Tasks carousel** (`/tasks`): random task display, `Ctrl+,` for next, dedup history per session. Send any task to your Google Calendar in one click.
- **Dashboard**: drag-and-drop widget grid powered by gridstack.
  - Rotating-text stats: "You crossed off 5 tasks (2 hard) last month", "You billed 1,200€ last month".
  - 30-day heat-bar of days you opened the app.
  - Daily streak with rest-reminder when ≥ 7 consecutive days.
  - Today panel: countdown to next work session, remaining time within an active session, and warnings for tasks deadlining inside the session.
  - "Working more isn't always better" nudge whenever you check off a task outside your work hours.
- **History**: completed projects, restorable.
- **Settings**: per-language UI (EN / ES / CA), weekly work schedule, Google Calendar connection, manual events, free-slot recommender.
- **LLM auto-tagging**: tasks are classified `easy / medium / hard` on creation. Cached locally with fuzzy phrase match — repeated phrases never hit the LLM. Free providers supported (Groq, Hugging Face) with a keyword fallback.
- **Public share links** (`/share/{id}`): generate a read-only URL for any post-it. Updates poll every 3 s. The store is pluggable: filesystem in dev, Upstash Redis in production.
- **Cloud sync**: opt-in Google Drive `appData` sync of your local projects, history and settings.

---

## Stack

| Layer            | Choice                                    |
|------------------|-------------------------------------------|
| Framework        | Next.js 15 (App Router, Server Components) |
| Language         | TypeScript (strict)                       |
| UI               | React 19 + Tailwind CSS                   |
| Drag & drop      | gridstack.js (dashboard) + custom (board) |
| Animations       | anime.js                                  |
| LLM              | Groq (free tier) or Hugging Face          |
| Auth             | Google OAuth 2.0                          |
| Persistence      | localStorage + Google Drive `appData`     |
| Share store      | Filesystem / Upstash Redis / in-memory    |

---

## Getting started

```bash
# 1. Install
npm install

# 2. (optional) Configure integrations
cp .env.example .env.local
# fill in any vars you want to enable

# 3. Run
npm run dev
```

Open http://localhost:3000 — the board works immediately. Connect Google in `/settings` if you want calendar features and Drive sync.

### Required at runtime

**Nothing.** The app boots with no env vars set:

- LLM auto-tagging falls back to a keyword heuristic.
- Google features show "Connect" instead of erroring.
- Share links work but their store is volatile (filesystem in dev, in-memory in serverless).

### Recommended for production

```env
# LLM tagging — Groq free tier is fast enough for interactive tagging.
GROQ_API_KEY=...

# Google OAuth — only the client id/secret are needed; redirect is auto-derived.
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...

# Persistent share links — required on Vercel (serverless filesystem is ephemeral).
UPSTASH_REDIS_REST_URL=...
UPSTASH_REDIS_REST_TOKEN=...
```

See `.env.example` for the full surface and provider links.

---

## Architecture notes

### Storage layers

The app intentionally keeps the user's data local-first:

```
Browser (localStorage)
   ├─ pmw:projects          ← active board
   ├─ pmw:history           ← completed projects
   ├─ pmw:settings          ← language, schedule, manual events
   ├─ pmw:mood              ← energy level
   ├─ pmw:task-tag-cache    ← LLM auto-tag memory
   ├─ pmw:usage-days        ← app-open day log (last 365)
   ├─ pmw:outside-hours-events
   └─ pmw:dashboard-layout-v2

Server (only when explicitly opted-in)
   ├─ Google Drive appData  ← user-owned cross-device sync
   └─ Share store           ← public read-only post-it snapshots
```

This means you can self-host Post-In't with no database. The only "server-owned" state is the share store, which is intentionally pluggable — see `lib/shareStore.ts`.

### Share store drivers

| Driver        | Trigger                                          | Notes                                         |
|---------------|--------------------------------------------------|-----------------------------------------------|
| Upstash Redis | `UPSTASH_REDIS_REST_URL` + token set             | Production-ready, free tier sufficient        |
| Filesystem    | Default (dev / long-running server)              | Files in `.share-store/`                      |
| In-memory     | Fallback on Vercel without Upstash               | Volatile across cold starts; warns at boot    |

To add another backend (Postgres, Vercel KV, Cloudflare KV, …) implement the `Driver` interface in `lib/shareStore.ts` and add a branch to `resolveDriver()`.

### LLM auto-tagging

`lib/classifyTask.ts` runs in the browser:

1. Look up the phrase in `localStorage` (exact + fuzzy token match ≥ 60 % overlap).
2. On miss, POST to `/api/classify-task`.
3. The route tries Groq → Hugging Face → keyword heuristic and never throws.
4. The result is written back to the cache so future tasks with similar wording skip the network round-trip.

### Auto-published share snapshots

When a post-it has a `shareId`, a debounced `useEffect` PUTs a sanitized snapshot to `/api/share/{id}` every time the project state changes. The public viewer polls `/api/share/{id}` every 3 s.

The snapshot strips: positions, sizes, internal IDs from the user's vault, and `autoTagSource`. Only what the URL needs to render the read-only card is published.

---

## API surface

| Route                                | Method | Purpose                                              |
|--------------------------------------|--------|------------------------------------------------------|
| `/api/auth/google`                   | GET    | OAuth start                                          |
| `/api/auth/google/callback`          | GET    | OAuth exchange + email cookie                        |
| `/api/auth/google/status`            | GET    | `{connected, email}`                                 |
| `/api/auth/google/disconnect`        | POST   | Clears refresh + email cookies                       |
| `/api/calendar/today`                | GET    | Today's events from primary calendar                 |
| `/api/calendar/event`                | POST   | Create an event (used by the carousel)               |
| `/api/classify-task`                 | POST   | `{text}` → `{tag, source}`                           |
| `/api/share/{id}`                    | GET / PUT / DELETE | Public read / owner publish / owner revoke |
| `/api/sync/load` `/api/sync/save`    | GET / POST | Drive `appData` sync                             |

All write endpoints validate input shape and bound size (≤ 200 tasks per share, ≤ 500 chars per task text, ≤ 64-char share id).

---

## Deploy to Vercel

1. Push this repo to GitHub, then import it from the Vercel dashboard, or use the deploy button at the top.
2. Add your env vars in **Project Settings → Environment Variables** (see `.env.example`).
3. After Google OAuth setup, register the production redirect:
   `https://<deployment>/api/auth/google/callback`.
4. (optional but recommended) Set `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` so share links survive cold starts.

---

## Contributing

PRs welcome. The codebase is intentionally small (no monorepo, no build pipeline beyond `next dev`/`next build`) and prefers boring TypeScript over abstraction.

```bash
npm run lint     # ESLint via Next
npm run build    # full type-check + production build
```

Please run `npm run build` before opening a PR — it catches all type errors and the Next.js page-data extraction step.

---

## License

MIT — see [LICENSE](./LICENSE).
