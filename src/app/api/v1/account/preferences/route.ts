import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { requireUser } from '@/middleware/auth'
import {
  getPersistentReminders,
  setPersistentReminders,
} from '@/repositories/profiles.repository'
import { jsonOk, toErrorResponse } from '@/lib/http'
import { AppError } from '@/lib/errors'

// GET /api/v1/account/preferences
// Auth: required — Returns: { persistentReminders: boolean }
export async function GET(): Promise<NextResponse> {
  try {
    const { supabase, user } = await requireUser()
    const persistentReminders = await getPersistentReminders(supabase, user.id)
    return jsonOk({ persistentReminders })
  } catch (error) {
    return toErrorResponse(error)
  }
}

const patchSchema = z.object({ persistent_reminders: z.boolean() }).strict()

// PATCH /api/v1/account/preferences
// Auth: required — Body: { persistent_reminders: boolean }
export async function PATCH(req: NextRequest): Promise<NextResponse> {
  try {
    const { supabase, user } = await requireUser()
    const parsed = patchSchema.safeParse(await req.json().catch(() => ({})))
    if (!parsed.success) {
      throw new AppError(422, 'That setting is not valid.', 'ACCOUNT_PREFS_INVALID')
    }
    await setPersistentReminders(supabase, user.id, parsed.data.persistent_reminders)
    return jsonOk({ persistentReminders: parsed.data.persistent_reminders })
  } catch (error) {
    return toErrorResponse(error)
  }
}
