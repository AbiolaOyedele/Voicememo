import { createAdminSupabaseClient } from '@/lib/supabase-admin'
import { getUserStats } from '@/repositories/admin.repository'
import { countFeedback, listRecentFeedback } from '@/repositories/feedback.repository'
import { countSubscriptions } from '@/repositories/push.repository'
import type { AdminUserStats } from '@/types/admin'
import type { FeedbackRecord } from '@/types/feedback'

/**
 * Admin dashboard reads. Each function fetches exactly what one dashboard tab
 * needs, using the service-role client — callers MUST have asserted admin
 * access (see requireAdmin) before invoking any of these.
 */

/** Dashboard tab: user/signup metrics plus the current subscriber count. */
export async function getDashboardMetrics(): Promise<{
  users: AdminUserStats
  pushSubscriberCount: number
}> {
  const admin = createAdminSupabaseClient()
  const [users, pushSubscriberCount] = await Promise.all([
    getUserStats(admin),
    countSubscriptions(admin),
  ])
  return { users, pushSubscriberCount }
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
