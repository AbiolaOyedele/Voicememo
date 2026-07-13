import { NextResponse, type NextRequest } from 'next/server'
import { requireUser } from '@/middleware/auth'
import { removeSubscription } from '@/services/push.service'
import { jsonOk, jsonError, toErrorResponse } from '@/lib/http'

// POST /api/v1/push/unsubscribe
// Auth: required. Removes the caller's subscription by endpoint.
// Body: { endpoint: string }
export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return jsonError('PUSH_UNSUBSCRIBE_INVALID', 'That subscription was invalid.', 400)
  }
  try {
    const { supabase } = await requireUser()
    await removeSubscription(supabase, body)
    return jsonOk({ ok: true })
  } catch (error) {
    return toErrorResponse(error)
  }
}
