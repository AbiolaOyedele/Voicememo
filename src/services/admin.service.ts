import { createAdminSupabaseClient } from '@/lib/supabase-admin'
import {
  getDailyStats,
  getDumpTotals,
  getUserAnalytics,
  getUserStats,
} from '@/repositories/admin.repository'
import { countFeedback, listRecentFeedback, updateFeedback } from '@/repositories/feedback.repository'
import { insertMessage } from '@/repositories/messages.repository'
import { countSubscriptions } from '@/repositories/push.repository'
import { getVisitStats } from '@/repositories/visits.repository'
import type {
  AdminUserStats,
  DailyStat,
  DumpTotals,
  UserAnalyticsRow,
  VisitStats,
} from '@/types/admin'
import type { FeedbackRecord } from '@/types/feedback'
import { AppError } from '@/lib/errors'
import { z } from 'zod'

/**
 * Admin dashboard reads. Each function fetches exactly what one dashboard tab
 * needs, using the service-role client — callers MUST have asserted admin
 * access (see requireAdmin) before invoking any of these.
 */

/**
 * Dashboard tab: user/signup metrics, visitor reach, lifetime recording totals
 * (including minutes recorded), a zero-filled daily growth series, per-user
 * usage, and the push-subscriber count — one call feeds the whole overview.
 */
export async function getDashboardMetrics(): Promise<{
  users: AdminUserStats
  pushSubscriberCount: number
  visits: VisitStats
  dumps: DumpTotals
  daily: DailyStat[]
  userAnalytics: UserAnalyticsRow[]
}> {
  const admin = createAdminSupabaseClient()
  const [users, pushSubscriberCount, visits, dumps, daily, userAnalytics] = await Promise.all([
    getUserStats(admin),
    countSubscriptions(admin),
    getVisitStats(admin),
    getDumpTotals(admin),
    getDailyStats(admin, 30),
    getUserAnalytics(admin, 100),
  ])
  return { users, pushSubscriberCount, visits, dumps, daily, userAnalytics }
}

const feedbackUpdateSchema = z
  .object({
    done: z.boolean().optional(),
    response: z.string().trim().min(1).max(2000).optional(),
  })
  .strict()

/**
 * Work a feedback item like a todo: check it off (done) and/or send a reply.
 * Either action delivers an in-app message to the submitter's Account tab —
 * feedback from guests (no user id) updates silently.
 */
export async function updateFeedbackItem(id: string, input: unknown): Promise<FeedbackRecord> {
  const parsed = feedbackUpdateSchema.safeParse(input)
  if (!parsed.success || (parsed.data.done === undefined && parsed.data.response === undefined)) {
    throw new AppError(422, 'That update is not valid.', 'ADMIN_FEEDBACK_UPDATE_INVALID')
  }
  const { done, response } = parsed.data
  const admin = createAdminSupabaseClient()

  const record = await updateFeedback(admin, id, {
    ...(done !== undefined
      ? { status: done ? 'done' : 'new', resolved_at: done ? new Date().toISOString() : null }
      : {}),
    ...(response !== undefined ? { response } : {}),
  })

  if (record.userId && (response !== undefined || done === true)) {
    const snippet = record.message.length > 80 ? `${record.message.slice(0, 77)}…` : record.message
    await insertMessage(admin, {
      userId: record.userId,
      kind: 'feedback_reply',
      title: response !== undefined ? 'A reply to your feedback' : 'Your feedback was addressed',
      body:
        response !== undefined
          ? response
          : `Thanks for flagging “${snippet}” — it's been taken care of.`,
      feedbackId: record.id,
    })
  }

  return record
}

/** Marketing tab: how many devices a broadcast would currently reach. */
export async function getPushSubscriberCount(): Promise<number> {
  return countSubscriptions(createAdminSupabaseClient())
}

/** Feedback tab: recent submissions and the total count. */
export async function getFeedback(): Promise<{ items: FeedbackRecord[]; count: number }> {
  const admin = createAdminSupabaseClient()
  const [items, count] = await Promise.all([listRecentFeedback(admin), countFeedback(admin)])
  return { items, count }
}
