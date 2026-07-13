import { createAdminSupabaseClient } from '@/lib/supabase-admin'
import { getUserStats } from '@/repositories/admin.repository'
import { countFeedback, listRecentFeedback } from '@/repositories/feedback.repository'
import { countSubscriptions } from '@/repositories/push.repository'
import type { AdminDashboardData } from '@/types/admin'

/**
 * Assemble everything the admin dashboard overview renders. Uses the
 * service-role client throughout — callers MUST have already asserted admin
 * access (see requireAdmin) before invoking this.
 */
export async function getDashboardData(): Promise<AdminDashboardData> {
  const admin = createAdminSupabaseClient()
  const [users, feedback, feedbackCount, pushSubscriberCount] = await Promise.all([
    getUserStats(admin),
    listRecentFeedback(admin),
    countFeedback(admin),
    countSubscriptions(admin),
  ])
  return { users, feedback, feedbackCount, pushSubscriberCount }
}
