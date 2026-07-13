import { NextResponse, type NextRequest } from 'next/server'
import { timingSafeEqual } from 'node:crypto'
import { z } from 'zod'
import { env } from '@/config/env.server'
import { sendSignupNotification } from '@/services/email.service'
import { jsonOk, jsonError, toErrorResponse } from '@/lib/http'
import { logger } from '@/lib/logger'

// POST /api/v1/hooks/new-user
// Auth: shared-secret header (not a user session). Called by a Supabase
// Database Webhook on INSERT into auth.users — never by the browser.
// Emails the operator when a new user signs up. Returns { data: { ok: true } }.

/** Header Supabase is configured to send the shared secret in. */
const SECRET_HEADER = 'x-signup-webhook-secret'

/**
 * Supabase Database Webhook envelope for an INSERT. We read only the fields we
 * need off `record`; provider lives in the auth metadata Supabase populates.
 */
const payloadSchema = z.object({
  type: z.literal('INSERT'),
  record: z.object({
    id: z.string().min(1),
    email: z.string().email().nullish(),
    created_at: z.string().nullish(),
    raw_app_meta_data: z.object({ provider: z.string() }).partial().nullish(),
  }),
})

/** Constant-time compare so a mismatched secret can't be timing-probed. */
function secretMatches(provided: string, expected: string): boolean {
  const a = Buffer.from(provided)
  const b = Buffer.from(expected)
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  // Refuse to run until the secret is configured, so an unset env var can never
  // leave this endpoint callable without authentication.
  if (!env.SIGNUP_WEBHOOK_SECRET) {
    logger.error({ errorCode: 'SIGNUP_HOOK_NOT_CONFIGURED' }, 'Signup webhook secret is not set')
    return jsonError('SIGNUP_HOOK_NOT_CONFIGURED', 'This endpoint is not configured.', 503)
  }

  const provided = req.headers.get(SECRET_HEADER)
  if (!provided || !secretMatches(provided, env.SIGNUP_WEBHOOK_SECRET)) {
    return jsonError('SIGNUP_HOOK_UNAUTHORIZED', 'Not authorized.', 401)
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return jsonError('SIGNUP_HOOK_INVALID_BODY', 'Invalid payload.', 400)
  }

  const parsed = payloadSchema.safeParse(body)
  if (!parsed.success) {
    // Not a shape we act on (e.g. a non-INSERT event) — acknowledge so Supabase
    // doesn't retry a payload we'll never process.
    logger.info({ errorCode: 'SIGNUP_HOOK_IGNORED_EVENT' }, 'Ignoring non-signup webhook event')
    return jsonOk({ ok: true, ignored: true })
  }

  try {
    const { record } = parsed.data
    await sendSignupNotification({
      userId: record.id,
      email: record.email ?? null,
      provider: record.raw_app_meta_data?.provider ?? null,
      createdAt: record.created_at ?? null,
    })
    return jsonOk({ ok: true })
  } catch (error) {
    return toErrorResponse(error)
  }
}
