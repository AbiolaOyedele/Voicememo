# Idea Dump

A mobile-first, installable PWA that lets a founder speak ideas freely on the go and get back a
clean, segmented, readable version of what was said.

- **Record** a voice note (up to 15 minutes)
- It's transcribed (Deepgram) and cleaned + topic-segmented (Claude)
- Browse, search, tag, and pin your dumps in a private **Library**
- Works offline — recordings queue locally and sync when you're back online

## Tech stack

| Concern         | Choice                                           |
| --------------- | ------------------------------------------------ |
| Framework       | Next.js 15 (App Router)                          |
| PWA             | next-pwa + Workbox (Step 10)                     |
| Database / Auth | Supabase (Postgres, RLS, Google OAuth)           |
| Audio storage   | Cloudflare R2 (S3-compatible, 7-day auto-delete) |
| Transcription   | Deepgram Nova-3                                  |
| AI processing   | Claude (Anthropic) — cleanup + segmentation      |
| Offline queue   | IndexedDB via `idb` + Workbox background sync    |
| Styling         | Tailwind CSS v4, NoirPro brand font              |
| Animation       | Framer Motion                                    |
| Validation      | Zod                                              |
| Deployment      | Vercel                                           |

## Local setup

Requirements: Node.js 20+ and npm.

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env.local
# then fill in real values (see below)

# 3. Run the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — it redirects to the Record tab.

### Brand font (NoirPro)

NoirPro is a licensed commercial font and is **not** committed to this repo. To enable it, drop
these files into `public/fonts/` and follow the instructions in [`src/app/fonts.ts`](src/app/fonts.ts):

```
public/fonts/NoirPro-Regular.woff2   (400)
public/fonts/NoirPro-Medium.woff2    (500)
public/fonts/NoirPro-Bold.woff2      (700)
```

Until then the app renders with a clean system-font fallback.

## Environment variables

All variables are validated on startup by [`src/config/env.ts`](src/config/env.ts) — the app
refuses to boot if any are missing or malformed. `src/config/env.ts` is the **only** file that
reads `process.env`; everything else imports the typed `env` object.

| Variable                        | Scope  | Purpose                   |
| ------------------------------- | ------ | ------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | public | Supabase project URL      |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | public | Supabase anon key         |
| `SUPABASE_SERVICE_ROLE_KEY`     | server | Supabase service role key |
| `R2_ACCOUNT_ID`                 | server | Cloudflare R2 account id  |
| `R2_ACCESS_KEY_ID`              | server | R2 access key             |
| `R2_SECRET_ACCESS_KEY`          | server | R2 secret                 |
| `R2_BUCKET_NAME`                | server | R2 bucket for audio       |
| `DEEPGRAM_API_KEY`              | server | Deepgram transcription    |
| `ANTHROPIC_API_KEY`             | server | Claude processing         |
| `NEXT_PUBLIC_SITE_URL`          | public | Base app URL              |

Server-only secrets must never be prefixed `NEXT_PUBLIC_`.

## Scripts

| Command             | What it does                        |
| ------------------- | ----------------------------------- |
| `npm run dev`       | Start the dev server                |
| `npm run build`     | Production build                    |
| `npm run start`     | Serve the production build          |
| `npm run lint`      | ESLint (Next + jsx-a11y + Prettier) |
| `npm run typecheck` | `tsc --noEmit` in strict mode       |
| `npm run format`    | Format with Prettier                |

## Architecture

Strict layering — see [`docs/architecture.md`](docs/architecture.md):

- **Routes** (`src/app/api/v1/`) call **services** only — no business logic.
- **Services** (`src/services/`) hold business logic and call repositories / third parties.
- **Repositories** (`src/repositories/`) hold all database queries.
- **Components** never touch Supabase, R2, Deepgram, or Claude directly.
- **Config** (`src/config/env.ts`) is the only reader of `process.env`.

## Offline sync

Recordings made while offline are stored in IndexedDB (`src/lib/offline-queue.ts`). A Workbox
background-sync flow plus the `useOfflineSync` hook flush the queue to `/api/v1/sync` when the
connection returns. (Implemented in Step 13.)

## Deployment

Deploys to Vercel. Set every environment variable above in the Vercel project settings before
the first deploy.

## Build status

This repo is being built in the documented step order. Completed so far: **Step 1 — project
scaffold** (structure, tooling, env validation, design tokens). Feature steps follow.
