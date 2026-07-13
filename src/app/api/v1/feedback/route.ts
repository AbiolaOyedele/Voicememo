import { NextResponse, type NextRequest } from 'next/server'
import { getOptionalUser } from '@/middleware/auth'
import { enforceRateLimit, getClientIp, RATE_LIMITS } from '@/middleware/rate-limit'
import { submitFeedback } from '@/services/feedback.service'
import { jsonOk, jsonError, toErrorResponse } from '@/lib/http'

// POST /api/v1/feedback
// Auth: optional (guests may submit too) — rate-limited per user id when
// signed in, else per best-effort client IP, since this is the app's one
// unauthenticated write endpoint.
// Delivers an in-app feedback submission to the feedback inbox via Resend.
// Body: { type: 'bug'|'feature'|'other', message, page_url?, app_version? }
// Returns: { data: { ok: true } }
export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return jsonError('FEEDBACK_SUBMIT_INVALID_BODY', 'That feedback could not be sent.', 400)
  }

  try {
    const user = await getOptionalUser()
    const identifier = user ? `${user.id}:feedback` : `ip:${getClientIp(req)}:feedback`
    enforceRateLimit(identifier, RATE_LIMITS.public)
    await submitFeedback(
      { userId: user?.id ?? null, userAgent: req.headers.get('user-agent') },
      body,
    )
    return jsonOk({ ok: true }, 201)
  } catch (error) {
    return toErrorResponse(error)
  }
}
