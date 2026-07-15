import { NextResponse, type NextRequest } from 'next/server'
import { getOptionalUser } from '@/middleware/auth'
import { enforceRateLimit, getClientIp, RATE_LIMITS } from '@/middleware/rate-limit'
import { submitFeedback } from '@/services/feedback.service'
import { jsonOk, jsonError, toErrorResponse } from '@/lib/http'
import { publicEnv } from '@/config/env'

// The marketing site's 404 page ("tell the king's men") reports broken links
// from its own origin — the only cross-origin caller this endpoint accepts.
// Deliberately narrow (no wildcard) per the CORS rule in CLAUDE.md.
const ALLOWED_ORIGINS = new Set([
  publicEnv.NEXT_PUBLIC_MARKETING_URL,
  publicEnv.NEXT_PUBLIC_MARKETING_URL.replace('https://www.', 'https://'),
])

function corsHeaders(origin: string | null): HeadersInit {
  if (!origin || !ALLOWED_ORIGINS.has(origin)) return {}
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  }
}

function withCors(res: NextResponse, headers: HeadersInit): NextResponse {
  for (const [key, value] of Object.entries(headers)) res.headers.set(key, value)
  return res
}

export async function OPTIONS(req: NextRequest): Promise<NextResponse> {
  return new NextResponse(null, { status: 204, headers: corsHeaders(req.headers.get('origin')) })
}

// POST /api/v1/feedback
// Auth: optional (guests may submit too) — rate-limited per user id when
// signed in, else per best-effort client IP, since this is the app's one
// unauthenticated write endpoint.
// Delivers an in-app feedback submission to the feedback inbox via Resend.
// Body: { type: 'bug'|'feature'|'other', message, page_url?, app_version? }
// Returns: { data: { ok: true } }
export async function POST(req: NextRequest): Promise<NextResponse> {
  const cors = corsHeaders(req.headers.get('origin'))

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return withCors(
      jsonError('FEEDBACK_SUBMIT_INVALID_BODY', 'That feedback could not be sent.', 400),
      cors,
    )
  }

  try {
    const user = await getOptionalUser()
    const identifier = user ? `${user.id}:feedback` : `ip:${getClientIp(req)}:feedback`
    enforceRateLimit(identifier, RATE_LIMITS.public)
    await submitFeedback(
      { userId: user?.id ?? null, userAgent: req.headers.get('user-agent') },
      body,
    )
    return withCors(jsonOk({ ok: true }, 201), cors)
  } catch (error) {
    return withCors(toErrorResponse(error), cors)
  }
}
