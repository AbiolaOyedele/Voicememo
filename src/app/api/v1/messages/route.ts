import { NextResponse } from 'next/server'
import { requireUser } from '@/middleware/auth'
import { listMyMessages } from '@/services/messages.service'
import { jsonOk, toErrorResponse } from '@/lib/http'

// GET /api/v1/messages — Auth: required — Returns: UserMessage[]
// The signed-in user's undismissed in-app messages (admin replies etc.).
export async function GET(): Promise<NextResponse> {
  try {
    const { supabase, user } = await requireUser()
    return jsonOk(await listMyMessages(supabase, user.id))
  } catch (error) {
    return toErrorResponse(error)
  }
}
