import { NextResponse, type NextRequest } from 'next/server'
import { requireUser } from '@/middleware/auth'
import { dismissMyMessage } from '@/services/messages.service'
import { jsonOk, toErrorResponse } from '@/lib/http'

type Ctx = { params: Promise<{ id: string }> }

// DELETE /api/v1/messages/[id] — Auth: required — Dismisses (hides) a message.
export async function DELETE(_req: NextRequest, { params }: Ctx): Promise<NextResponse> {
  try {
    const { id } = await params
    const { supabase, user } = await requireUser()
    await dismissMyMessage(supabase, user.id, id)
    return jsonOk({ success: true })
  } catch (error) {
    return toErrorResponse(error)
  }
}
