# Architecture

## Layering (hard rules)

```
Component / Page  →  Service  →  Repository  →  Supabase
                        │
                        ├─→  storage.service   →  R2 (lib/r2.ts)
                        ├─→  transcription.svc  →  Deepgram (lib/deepgram.ts)
                        └─→  ai.service         →  Claude (lib/claude.ts)
```

- **Route handlers** (`src/app/api/v1/**`) verify the session, validate input with Zod, and call
  a **service**. They contain zero business logic.
- **Services** (`src/services/**`) own business logic. They orchestrate repositories and
  third-party clients and throw `AppError` for expected failures.
- **Repositories** (`src/repositories/**`) are the only place that runs database queries. Every
  query on user-owned data filters by `user_id` (defense in depth on top of RLS).
- **Components** (`src/components/**`) never talk to Supabase, R2, Deepgram, or Claude directly —
  they call route handlers or receive data via props/hooks.
- **Config** (`src/config/env.ts`) is the single reader of `process.env`.

## Error handling

`AppError(statusCode, message, code, details?)` (`src/lib/errors.ts`) is thrown by services.
Route handlers translate it to the consistent client shape:

```json
{ "error": { "code": "DOMAIN_ACTION_REASON", "message": "Plain English." } }
```

No stack traces or internal details ever reach the client.

## Recording lifecycle

```
record (client)
  → POST /api/v1/upload      (presigned R2 URL, rejects > 900s)
  → PUT audio → R2
  → POST /api/v1/transcribe  (Deepgram → raw_transcript)
  → POST /api/v1/process     (Claude → clean_transcript + segments)
  → dump.status = 'ready'
```

`dumps.status` moves through `queued → uploading → transcribing → processing → ready` (or
`failed`). Audio in R2 auto-deletes after 7 days; `r2_audio_key` becomes null thereafter.

## Offline path

```
record offline → IndexedDB queue (lib/offline-queue.ts)
  → connection restored → Workbox background sync + useOfflineSync
  → POST /api/v1/sync → normal upload/transcribe/process pipeline
```

## Data model

See the migration in `supabase/migrations/`. Tables: `profiles`, `dumps`. RLS is enabled on both
from the first migration; policies restrict every operation to `auth.uid()`.
