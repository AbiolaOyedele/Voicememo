import type { SupabaseClient } from '@supabase/supabase-js'
import { AppError } from '@/lib/errors'
import type { AdminStatsRow, AdminUserStats } from '@/types/admin'

/**
 * Read-only admin metrics. auth.users is not exposed over PostgREST, so counts
 * and recent signups come from the `idea_dump_admin_stats` SECURITY DEFINER
 * function, callable only by the service role. Pass the service-role client.
 */
export async function getUserStats(admin: SupabaseClient): Promise<AdminUserStats> {
  const { data, error } = await admin.rpc('idea_dump_admin_stats')
  if (error || !data) {
    throw new AppError(502, 'Could not load user stats.', 'DB_ADMIN_STATS_FAILED', error)
  }
  const row = data as AdminStatsRow
  return {
    totalUsers: row.total_users,
    signupsToday: row.signups_today,
    signups7d: row.signups_7d,
    signups30d: row.signups_30d,
    recentSignups: (row.recent_signups ?? []).map((s) => ({
      id: s.id,
      email: s.email,
      createdAt: s.created_at,
      provider: s.provider,
    })),
  }
}
