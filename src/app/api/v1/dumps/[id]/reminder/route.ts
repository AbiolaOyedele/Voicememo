import { NextResponse, type NextRequest } from 'next/server'
import { requireUser } from '@/middleware/auth'
import { cancelReminderForDump, getReminderForUser } from '@/services/reminders.service'
import { jsonOk, toErrorResponse } from '@/lib/http'

type Ctx = { params: Promise<{ id: string }> }

// GET /api/v1/dumps/[id]/reminder
// Auth: required — Returns: { id, remind_at, message, status } | null
export async function GET(_req: NextRequest, { params }: Ctx): Promise<NextResponse> {
  try {
    const { id } = await params
    const { supabase, user } = await requireUser()
    const reminder = await getReminderForUser(supabase, user.id, id)
    if (!reminder) return jsonOk(null)
    return jsonOk({
      id: reminder.id,
      remind_at: reminder.remind_at,
      message: reminder.message,
      status: reminder.status,
    })
  } catch (error) {
    return toErrorResponse(error)
  }
}

// DELETE /api/v1/dumps/[id]/reminder
// Auth: required — Cancels the dump's pending reminder. Returns: { success: true }
export async function DELETE(_req: NextRequest, { params }: Ctx): Promise<NextResponse> {
  try {
    const { id } = await params
    const { supabase, user } = await requireUser()
    await cancelReminderForDump(supabase, user.id, id)
    return jsonOk({ success: true })
  } catch (error) {
    return toErrorResponse(error)
  }
}
