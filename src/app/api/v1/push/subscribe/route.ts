import { NextResponse, type NextRequest } from 'next/server'
import { requireUser } from '@/middleware/auth'
import { saveSubscription } from '@/services/push.service'
import { jsonOk, jsonError, toErrorResponse } from '@/lib/http'

// POST /api/v1/push/subscribe
// Auth: required. Saves (or refreshes) the caller's web-push subscription.
// Body: a browser PushSubscription JSON { endpoint, keys: { p256dh, auth } }.
export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return jsonError('PUSH_SUBSCRIBE_INVALID', 'That subscription was invalid.', 400)
  }
  try {
    const { supabase, user } = await requireUser()
    await saveSubscription(supabase, user.id, body, req.headers.get('user-agent'))
    return jsonOk({ ok: true }, 201)
  } catch (error) {
    return toErrorResponse(error)
  }
}
