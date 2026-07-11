import { z } from 'zod'

/**
 * Runtime environment schema. Validated once on import so the app fails fast
 * on boot rather than deep inside a request when a secret is missing.
 *
 * This module is the ONLY place allowed to read `process.env`. Every other
 * file imports the typed `env` object from here.
 */
const envSchema = z.object({
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

  // App
  NEXT_PUBLIC_SITE_URL: z.string().url(),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
})

/**
 * During `next build`, client bundles are compiled without server-only secrets
 * present. Validating the full schema at import time would crash the build.
 * We therefore skip hard validation when the build phase is active and rely on
 * runtime validation when the server actually boots.
 */
const isBuildPhase = process.env.NEXT_PHASE === 'phase-production-build'

const parsed = envSchema.safeParse(process.env)

if (!parsed.success && !isBuildPhase) {
  console.error('❌ Invalid environment variables:', parsed.error.flatten().fieldErrors)
  throw new Error('Environment validation failed. App cannot start.')
}

/**
 * Typed, validated environment configuration.
 * Falls back to raw `process.env` values only during the build phase, where the
 * full secret set is intentionally absent.
 */
export const env = (parsed.success ? parsed.data : (process.env as unknown)) as z.infer<
  typeof envSchema
>
