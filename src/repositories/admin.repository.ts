import type { SupabaseClient } from '@supabase/supabase-js'
import { AppError } from '@/lib/errors'
import type {
  AdminStatsRow,
  AdminUserStats,
  DailyStat,
  DumpTotals,
  UserAnalyticsRow,
} from '@/types/admin'

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

interface DailyStatRow {
  day: string
  signups: number
  visitors: number
  recordings: number
}

/** Zero-filled daily series (signups/visitors/recordings) for the growth chart. */
export async function getDailyStats(admin: SupabaseClient, days = 30): Promise<DailyStat[]> {
  const { data, error } = await admin.rpc('idea_dump_admin_daily_stats', { days })
  if (error || !data) {
    throw new AppError(502, 'Could not load daily stats.', 'DB_ADMIN_DAILY_STATS_FAILED', error)
  }
  return (data as DailyStatRow[]).map((r) => ({
    day: r.day,
    signups: r.signups,
    visitors: r.visitors,
    recordings: r.recordings,
  }))
}

interface DumpTotalsRow {
  total: number
  total_seconds: number
  ready: number
  failed: number
  in_flight: number
  transcribed: number
  action_plans: number
}

/** Lifetime dump totals, including total recorded seconds. */
export async function getDumpTotals(admin: SupabaseClient): Promise<DumpTotals> {
  const { data, error } = await admin.rpc('idea_dump_admin_dump_totals')
  if (error || !data) {
    throw new AppError(502, 'Could not load dump totals.', 'DB_ADMIN_DUMP_TOTALS_FAILED', error)
  }
  const row = data as DumpTotalsRow
  return {
    total: row.total,
    totalSeconds: row.total_seconds,
    ready: row.ready,
    failed: row.failed,
    inFlight: row.in_flight,
    transcribed: row.transcribed,
    actionPlans: row.action_plans,
  }
}

interface UserAnalyticsRpcRow {
  id: string
  email: string | null
  signed_up_at: string
  ideas: number
  total_seconds: number
  transcribed: number
  action_plans: number
  failed: number
  last_recording_at: string | null
}

/** Per-user lifetime usage, most active first. */
export async function getUserAnalytics(
  admin: SupabaseClient,
  maxRows = 100,
): Promise<UserAnalyticsRow[]> {
  const { data, error } = await admin.rpc('idea_dump_admin_user_analytics', { max_rows: maxRows })
  if (error || !data) {
    throw new AppError(502, 'Could not load user analytics.', 'DB_ADMIN_USER_ANALYTICS_FAILED', error)
  }
  return (data as UserAnalyticsRpcRow[]).map((r) => ({
    id: r.id,
    email: r.email,
    signedUpAt: r.signed_up_at,
    ideas: r.ideas,
    totalSeconds: r.total_seconds,
    transcribed: r.transcribed,
    actionPlans: r.action_plans,
    failed: r.failed,
    lastRecordingAt: r.last_recording_at,
  }))
}
