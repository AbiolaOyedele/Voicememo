import { NextResponse, type NextRequest } from 'next/server'
import { requireUser } from '@/middleware/auth'
import { enforceRateLimit, RATE_LIMITS } from '@/middleware/rate-limit'
import {
  cancelReminderById,
  createUserReminder,
  listRemindersForUser,
} from '@/services/reminders.service'
import { jsonOk, toErrorResponse } from '@/lib/http'
import { AppError } from '@/lib/errors'

type Ctx = { params: Promise<{ id: string }> }

// GET /api/v1/dumps/[id]/reminder
// Auth: required — Returns: ReminderSummary[] (pending only, soonest first)
export async function GET(_req: NextRequest, { params }: Ctx): Promise<NextResponse> {
  try {
    const { id } = await params
    const { supabase, user } = await requireUser()
    const reminders = await listRemindersForUser(supabase, user.id, id)
    return jsonOk(
      reminders.map((r) => ({
        id: r.id,
        remind_at: r.remind_at,
        message: r.message,
        status: r.status,
      })),
    )
  } catch (error) {
    return toErrorResponse(error)
  }
}

// POST /api/v1/dumps/[id]/reminder
// Auth: required — Body: { remind_at: ISO string, message? }
// Creates a user-set reminder (max 2 pending per idea). Returns: ReminderSummary
export async function POST(req: NextRequest, { params }: Ctx): Promise<NextResponse> {
  try {
    const { id } = await params
    const { supabase, user } = await requireUser()
    enforceRateLimit(`${user.id}:reminder-create`, RATE_LIMITS.paid)
    const body: unknown = await req.json().catch(() => ({}))
    const reminder = await createUserReminder(supabase, user.id, id, body)
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

// DELETE /api/v1/dumps/[id]/reminder?reminderId=<uuid>
// Auth: required — Cancels one pending reminder. Returns: { success: true }
export async function DELETE(req: NextRequest, { params }: Ctx): Promise<NextResponse> {
  try {
    await params
    const { supabase, user } = await requireUser()
    const reminderId = req.nextUrl.searchParams.get('reminderId')
    if (!reminderId) {
      throw new AppError(422, 'Say which reminder to cancel.', 'REMINDER_CANCEL_INVALID')
    }
    await cancelReminderById(supabase, user.id, reminderId)
    return jsonOk({ success: true })
  } catch (error) {
    return toErrorResponse(error)
  }
}
