import { env } from '@/config/env.server'
import { getResendClient } from '@/lib/resend'
import { logger } from '@/lib/logger'
import { AppError } from '@/lib/errors'
import type { FeedbackType } from '@/types/feedback'

/** Escapes a string for safe interpolation into HTML email bodies. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

const TYPE_LABEL: Record<FeedbackType, string> = {
  bug: '🐞 Bug',
  feature: '✨ Feature',
  other: '💬 Other',
}

export interface FeedbackNotification {
  type: FeedbackType
  message: string
  /** Signed-in user id, or null for a guest. */
  userId: string | null
  pageUrl: string | null
  appVersion: string | null
  userAgent: string | null
}

/**
 * Delivers a feedback submission to the feedback inbox via Resend.
 *
 * Throws {@link AppError} when email isn't configured or the send fails, since
 * email is the only sink for feedback — the caller surfaces a plain-English
 * retry to the user rather than silently dropping the note.
 */
export async function sendFeedbackNotification(input: FeedbackNotification): Promise<void> {
  const resend = getResendClient()
  const to = env.FEEDBACK_TO_EMAIL

  if (!resend || !to) {
    logger.error(
      { errorCode: 'FEEDBACK_EMAIL_NOT_CONFIGURED', hasKey: Boolean(resend), hasTo: Boolean(to) },
      'Feedback email is not configured',
    )
    throw new AppError(
      503,
      'Feedback is temporarily unavailable. Please try again later.',
      'FEEDBACK_EMAIL_NOT_CONFIGURED',
    )
  }

  const label = TYPE_LABEL[input.type]
  const meta: string[] = [
    `From: ${input.userId ? `user ${input.userId}` : 'guest'}`,
    input.pageUrl ? `Page: ${input.pageUrl}` : null,
    input.appVersion ? `Version: ${input.appVersion}` : null,
    input.userAgent ? `Agent: ${input.userAgent}` : null,
  ].filter((line): line is string => line !== null)

  const html = `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#111;line-height:1.6">
      <p style="margin:0 0 12px"><strong>New ${escapeHtml(label)} feedback</strong></p>
      <div style="white-space:pre-wrap;font-size:15px;margin:0 0 16px">${escapeHtml(input.message)}</div>
      <p style="font-size:13px;color:#6b7280;margin:0">${meta.map(escapeHtml).join(' · ')}</p>
    </div>
  `.trim()

  const text = `New ${label} feedback\n\n${input.message}\n\n${meta.join('\n')}`

  const { data, error } = await resend.emails.send({
    from: env.FEEDBACK_FROM_EMAIL,
    to,
    subject: `[Dumpty] ${label} feedback`,
    html,
    text,
  })

  if (error) {
    logger.error({ errorCode: 'FEEDBACK_EMAIL_SEND_FAILED', err: error.message }, 'Feedback email send failed')
    throw new AppError(
      502,
      "That didn't send. Please check your connection and try again.",
      'FEEDBACK_EMAIL_SEND_FAILED',
    )
  }

  logger.info({ id: data?.id }, 'Feedback email sent')
}
