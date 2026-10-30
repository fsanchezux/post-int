<img width="1923" height="1085" alt="header" src="https://github.com/user-attachments/assets/656fda32-92cb-4ee1-b85c-95062400efcb" /> 

# Post-In't

It's not easy to stay organized while keeping your **creative instincts alive**. This app was born from the idea of finding **the perfect balance between organization and creativity**.

Organize your **project moodboards** with simple Posts-its. Share them and break them down into tasks to stay on top of all your work. This is a **mini app** built with a **clear, concise goal**: it doesn't try to solve more than it needs to, and it focuses on **boosting productivity for a specific creative niche**.

<p align="center">
  <img width="49%" alt="preview1" src="https://github.com/user-attachments/assets/ecd3e5f6-2133-4824-afef-4f56ff863645" />
  <img width="49%" alt="Mesa de trabajo 1" src="https://github.com/user-attachments/assets/a8f71307-290d-40b1-a996-a7dad8908f20" />
</p>

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

## License

MIT — see [LICENSE](./LICENSE).
