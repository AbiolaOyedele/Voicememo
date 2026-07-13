import { z } from 'zod'

/**
 * Server-only environment configuration, including secrets. This module must
 * NEVER be imported from a Client Component or edge middleware — only from
 * Server Components, Route Handlers, Server Actions, services, and the
 * instrumentation boot hook. Client-safe public vars live in `./env`.
 *
 * The `window` guard below fails loudly if this ever ends up in a browser
 * bundle, so the boundary can't be crossed silently.
 */
if (typeof window !== 'undefined') {
  throw new Error('env.server.ts was imported in the browser — use publicEnv from ./env instead.')
}

const serverSchema = z.object({
  // Supabase
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),

  // Cloudflare R2 (S3-compatible)
  R2_ACCOUNT_ID: z.string().min(1),
  R2_ACCESS_KEY_ID: z.string().min(1),
  R2_SECRET_ACCESS_KEY: z.string().min(1),
  R2_BUCKET_NAME: z.string().min(1),

  // Third-party AI services
  DEEPGRAM_API_KEY: z.string().min(1),
  ANTHROPIC_API_KEY: z.string().min(1),

  // Email (Resend) — feedback delivery. Optional so local/dev without a key
  // doesn't hard-fail boot; the feedback service reports a clear error when the
  // key is missing at send time.
  RESEND_API_KEY: z.string().min(1).optional(),
  // Sender identity, e.g. `Dumpty <hello@theruff.agency>`. Must be a verified
  // Resend domain. Falls back to Resend's shared onboarding sender.
  FEEDBACK_FROM_EMAIL: z.string().min(1).default('Dumpty <onboarding@resend.dev>'),
  // Destination inbox for feedback submissions.
  FEEDBACK_TO_EMAIL: z.string().email().optional(),
  // Optional CC on all operator notifications (feedback + signup), so a
  // personal inbox gets a copy alongside the primary hello@ address.
  NOTIFY_CC_EMAIL: z.string().email().optional(),
  // Shared secret guarding the new-user webhook. Supabase sends it as a custom
  // header; the route rejects any request whose header doesn't match. Optional
  // so boot doesn't hard-fail before it's set, but the route refuses to run
  // (503) until it is, so an unconfigured endpoint can't be called anonymously.
  SIGNUP_WEBHOOK_SECRET: z.string().min(1).optional(),
  // Destination inbox for new-signup alerts. Falls back to FEEDBACK_TO_EMAIL.
  SIGNUP_NOTIFY_TO_EMAIL: z.string().email().optional(),

  // Admin dashboard (/humpty) — comma-separated allowlist of emails permitted
  // to sign in and reach the dashboard. Everyone else 404s.
  ADMIN_EMAILS: z.string().min(1).optional(),

  // Web Push (VAPID). Public key is also exposed to the client via
  // NEXT_PUBLIC_VAPID_PUBLIC_KEY; the private key is server-only. Subject must
  // be a mailto: or https: URL identifying the sender to push services.
  VAPID_PUBLIC_KEY: z.string().min(1).optional(),
  VAPID_PRIVATE_KEY: z.string().min(1).optional(),
  VAPID_SUBJECT: z.string().min(1).default('mailto:hello@theruff.agency'),

  // App
  NEXT_PUBLIC_SITE_URL: z.string().url(),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),

  // Deploy-freshness detection — Vercel sets this automatically. Read at
  // request time (never cached) so /api/v1/version always reports the live
  // deploy, unlike NEXT_PUBLIC_BUILD_ID which is baked in at build time.
  VERCEL_GIT_COMMIT_SHA: z.string().optional(),
})

type ServerEnv = z.infer<typeof serverSchema>

/** During `next build`, server secrets are intentionally absent — don't hard-fail. */
const isBuildPhase = process.env.NEXT_PHASE === 'phase-production-build'

let cached: ServerEnv | null = null

/**
 * Validate and return the full server environment. Throws if a required secret
 * is missing or malformed (unless the build phase is active). Result is cached.
 */
export function validateServerEnv(): ServerEnv {
  if (cached) return cached
  const parsed = serverSchema.safeParse(process.env)
  if (!parsed.success) {
    if (isBuildPhase) return process.env as unknown as ServerEnv
    console.error('❌ Invalid server environment variables:', parsed.error.flatten().fieldErrors)
    throw new Error('Server environment validation failed. App cannot start.')
  }
  cached = parsed.data
  return cached
}

/** Full, validated server configuration (includes secrets). Server-only. */
export const env: ServerEnv = validateServerEnv()
