import { z } from 'zod'
import { createAdminSupabaseClient } from '@/lib/supabase-admin'
import { recordVisit as recordVisitInDb } from '@/repositories/visits.repository'
import { AppError } from '@/lib/errors'

const visitIdSchema = z.string().uuid()

/**
 * Record one anonymous visit. `visitorId` is the browser's long-lived
 * `dumpty_vid` cookie value, generated client-side — never tied to an
 * account, never PII.
 */
export async function recordVisit(visitorId: unknown): Promise<void> {
  const parsed = visitIdSchema.safeParse(visitorId)
  if (!parsed.success) {
    throw new AppError(400, 'That request was invalid.', 'VISIT_RECORD_INVALID_ID')
  }
  await recordVisitInDb(createAdminSupabaseClient(), parsed.data)
}
