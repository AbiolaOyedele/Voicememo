import { z } from 'zod'
import { AppError } from '@/lib/errors'
import { createAdminSupabaseClient } from '@/lib/supabase-admin'
import { insertFeedback } from '@/repositories/feedback.repository'
import type { Feedback } from '@/types/feedback'

const submitSchema = z.object({
  type: z.enum(['bug', 'feature', 'other']),
  message: z.string().trim().min(3, 'Please add a little more detail.').max(5000),
  page_url: z.string().max(2000).optional().nullable(),
  app_version: z.string().max(50).optional().nullable(),
})

/** Context the route resolves from the request (not from the client body). */
export interface SubmitFeedbackContext {
  /** Signed-in user's id, or null for a guest. */
  userId: string | null
  userAgent: string | null
}

/**
 * Validates and stores a feedback submission. Writes through the service-role
 * client so guests (no auth session) can submit too; the stored row is the
 * durable record the admin reads. Trust for user_id/user_agent comes from the
 * request context, never the client body.
 */
export async function submitFeedback(
  ctx: SubmitFeedbackContext,
  input: unknown,
): Promise<Feedback> {
  const parsed = submitSchema.safeParse(input)
  if (!parsed.success) {
    throw new AppError(
      400,
      parsed.error.issues[0]?.message ?? 'That feedback could not be sent.',
      'FEEDBACK_SUBMIT_INVALID_INPUT',
    )
  }
  const { type, message, page_url, app_version } = parsed.data

  const db = createAdminSupabaseClient()
  return insertFeedback(db, {
    user_id: ctx.userId,
    type,
    message,
    page_url: page_url ?? null,
    app_version: app_version ?? null,
    user_agent: ctx.userAgent,
  })
}
