import { NextResponse, type NextRequest } from 'next/server'
import { enforceRateLimit, getClientIp, RATE_LIMITS } from '@/middleware/rate-limit'
import { recordVisit } from '@/services/visits.service'
import { jsonOk, jsonError, toErrorResponse } from '@/lib/http'

// POST /api/v1/visits
// Auth: none — this endpoint exists specifically to count anonymous visitors,
// rate-limited per client IP since there's no user id to key on.
// Body: { visitorId: string (uuid) } — the dumpty_vid cookie, set once per
// browser by the client on first load. Repeat ids are ignored, not double-counted.
export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return jsonError('VISIT_RECORD_INVALID_BODY', 'That request was invalid.', 400)
  }
  try {
    enforceRateLimit(`ip:${getClientIp(req)}:visit`, RATE_LIMITS.public)
    const { visitorId } = body as { visitorId?: unknown }
    await recordVisit(visitorId)
    return jsonOk({ ok: true }, 201)
  } catch (error) {
    return toErrorResponse(error)
  }
}
