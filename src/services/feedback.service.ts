import { z } from 'zod'
import { AppError } from '@/lib/errors'
import { sendFeedbackNotification } from '@/services/email.service'

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
 * Validates a feedback submission and delivers it to the feedback inbox via
 * Resend email. Trust for user_id/user_agent comes from the request context,
 * never the client body. Throws {@link AppError} on invalid input or a failed
 * send so the client can surface a plain-English retry.
 */
export async function submitFeedback(
  ctx: SubmitFeedbackContext,
  input: unknown,
): Promise<void> {
  const parsed = submitSchema.safeParse(input)
  if (!parsed.success) {
    throw new AppError(
      400,
      parsed.error.issues[0]?.message ?? 'That feedback could not be sent.',
      'FEEDBACK_SUBMIT_INVALID_INPUT',
    )
  }
  const { type, message, page_url, app_version } = parsed.data

  await sendFeedbackNotification({
    type,
    message,
    userId: ctx.userId,
    pageUrl: page_url ?? null,
    appVersion: app_version ?? null,
    userAgent: ctx.userAgent,
  })
}
