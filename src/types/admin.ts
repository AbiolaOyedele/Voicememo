import type { FeedbackRecord } from '@/types/feedback'

/** A recent signup row surfaced on the admin dashboard. */
export interface RecentSignup {
  id: string
  email: string | null
  createdAt: string
  provider: string | null
}

/** Raw shape returned by the `idea_dump_admin_stats` RPC (snake_case). */
export interface AdminStatsRow {
  total_users: number
  signups_today: number
  signups_7d: number
  signups_30d: number
  recent_signups: Array<{
    id: string
    email: string | null
    created_at: string
    provider: string | null
  }>
}

/** User/signup metrics for the dashboard overview. */
export interface AdminUserStats {
  totalUsers: number
  signupsToday: number
  signups7d: number
  signups30d: number
  recentSignups: RecentSignup[]
}

/** Anonymous visitor counts for the dashboard overview. */
export interface VisitStats {
  totalVisitors: number
  visitorsToday: number
  visitors7d: number
  visitors30d: number
}

/** Everything the dashboard overview renders. */
export interface AdminDashboardData {
  users: AdminUserStats
  feedback: FeedbackRecord[]
  feedbackCount: number
  pushSubscriberCount: number
}
