import { NextResponse, type NextRequest } from 'next/server'
import { getOptionalUser } from '@/middleware/auth'
import { submitFeedback } from '@/services/feedback.service'
import { jsonOk, jsonError, toErrorResponse } from '@/lib/http'

// POST /api/v1/feedback
// Auth: optional (guests may submit too).
// Stores an in-app feedback submission as the durable record.
// Body: { type: 'bug'|'feature'|'other', message, page_url?, app_version? }
// Returns: { data: { id } }
export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return jsonError('FEEDBACK_SUBMIT_INVALID_BODY', 'That feedback could not be sent.', 400)
  }

  try {
    const user = await getOptionalUser()
    const feedback = await submitFeedback(
      { userId: user?.id ?? null, userAgent: req.headers.get('user-agent') },
      body,
    )
    return jsonOk({ id: feedback.id }, 201)
  } catch (error) {
    return toErrorResponse(error)
  }
}
