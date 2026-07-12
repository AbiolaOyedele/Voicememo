import { z } from 'zod'

/**
 * Client-safe environment configuration: the `NEXT_PUBLIC_*` subset only.
 * Safe to import anywhere — Client Components, Server Components, edge
 * middleware. Validated eagerly at import.
 *
 * Server-only secrets live in `env.server.ts`, which must never enter a client
 * bundle. Together these two files are the only readers of `process.env`.
 */
const publicSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  NEXT_PUBLIC_SITE_URL: z.string().url(),
  // Deploy-freshness detection (set in next.config.ts from the Vercel commit
  // SHA). Compared against /api/v1/version to detect a newer live deploy.
  NEXT_PUBLIC_BUILD_ID: z.string().optional(),
})

type PublicEnv = z.infer<typeof publicSchema>

/** During `next build`, absent public vars should not hard-fail the build. */
const isBuildPhase = process.env.NEXT_PHASE === 'phase-production-build'

// `NEXT_PUBLIC_*` vars are inlined by Next; reference each statically so they
// exist in the client bundle rather than reading `process.env` dynamically.
const publicParsed = publicSchema.safeParse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  NEXT_PUBLIC_BUILD_ID: process.env.NEXT_PUBLIC_BUILD_ID,
})

if (!publicParsed.success && !isBuildPhase) {
  console.error(
    '❌ Invalid public environment variables:',
    publicParsed.error.flatten().fieldErrors,
  )
  throw new Error('Public environment validation failed. App cannot start.')
}

/** Client-safe public configuration. */
export const publicEnv = (publicParsed.success
  ? publicParsed.data
  : process.env) as unknown as PublicEnv
