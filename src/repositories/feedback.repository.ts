import type { SupabaseClient } from '@supabase/supabase-js'
import type { Feedback } from '@/types/feedback'

/** Fields written when a user submits feedback. */
export interface InsertFeedbackRow {
  user_id: string | null
  type: string
  message: string
  page_url: string | null
  app_version: string | null
  user_agent: string | null
}

/**
 * Inserts a feedback row and returns it. `db` must be the service-role client:
 * submissions can come from guests (no auth session), and there is no client
 * INSERT policy on the table.
 */
export async function insertFeedback(
  db: SupabaseClient,
  row: InsertFeedbackRow,
): Promise<Feedback> {
  const { data, error } = await db.from('idea_dump_feedback').insert(row).select('*').single()
  if (error) throw error
  return data as Feedback
}
