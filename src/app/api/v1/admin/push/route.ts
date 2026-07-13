import { NextResponse, type NextRequest } from 'next/server'
import { requireAdmin } from '@/middleware/auth'
import { broadcastPush } from '@/services/push.service'
import { jsonOk, jsonError, toErrorResponse } from '@/lib/http'

// POST /api/v1/admin/push
// Auth: admin only (email allowlist). Broadcasts a push to all subscribers.
// Body: { title: string, body: string, url?: string }
export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return jsonError('PUSH_BROADCAST_INVALID', 'That notification was invalid.', 400)
  }
  try {
    await requireAdmin()
    const result = await broadcastPush(body)
    return jsonOk(result)
  } catch (error) {
    return toErrorResponse(error)
  }
}
