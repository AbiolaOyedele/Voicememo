import type { SupabaseClient } from '@supabase/supabase-js'
import { AppError } from '@/lib/errors'
import type { VisitStats } from '@/types/admin'

/**
 * All database access for the anonymous visitor counter. Namespaced
 * (`idea_dump_visits`) because this app shares its Supabase database.
 * Service-role client only — there is no per-user access to this table.
 */
const VISITS_TABLE = 'idea_dump_visits'

/**
 * Record a browser's first visit, keyed by its long-lived `dumpty_vid`
 * cookie. Idempotent — a repeat call with the same id (e.g. a redirect chain
 * racing the cookie round-trip) is silently ignored rather than double-counted.
 */
export async function recordVisit(admin: SupabaseClient, visitorId: string): Promise<void> {
  const { error } = await admin
    .from(VISITS_TABLE)
    .upsert({ visitor_id: visitorId }, { onConflict: 'visitor_id', ignoreDuplicates: true })
  if (error) {
    throw new AppError(502, 'Could not record the visit.', 'DB_VISIT_RECORD_FAILED', error)
  }
}

/** Total unique visitors, plus today/7d/30d breakdowns. Service-role client only. */
export async function getVisitStats(admin: SupabaseClient): Promise<VisitStats> {
  const now = new Date()
  const startOfToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  const countSince = async (since?: Date): Promise<number> => {
    let query = admin.from(VISITS_TABLE).select('id', { count: 'exact', head: true })
    if (since) query = query.gte('created_at', since.toISOString())
    const { count, error } = await query
    if (error) {
      throw new AppError(502, 'Could not count visitors.', 'DB_VISIT_COUNT_FAILED', error)
    }
    return count ?? 0
  }

  const [totalVisitors, visitorsToday, visitors7d, visitors30d] = await Promise.all([
    countSince(),
    countSince(startOfToday),
    countSince(sevenDaysAgo),
    countSince(thirtyDaysAgo),
  ])
  return { totalVisitors, visitorsToday, visitors7d, visitors30d }
}
