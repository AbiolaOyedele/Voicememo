import type { SupabaseClient } from '@supabase/supabase-js'
import { AppError } from '@/lib/errors'
import type { FeedbackRecord, FeedbackType } from '@/types/feedback'

/**
 * All database access for the feedback table. Namespaced (`idea_dump_feedback`)
 * because this app shares its Supabase database with other projects. Writes
 * happen through the service-role client (guests have no session); admin reads
 * also use the service role (there is no broad client SELECT policy).
 */
const FEEDBACK_TABLE = 'idea_dump_feedback'

export interface InsertFeedbackInput {
  userId: string | null
  type: FeedbackType
  message: string
  pageUrl: string | null
  appVersion: string | null
  userAgent: string | null
}

interface FeedbackRow {
  id: string
  user_id: string | null
  type: FeedbackType
  message: string
  page_url: string | null
  app_version: string | null
  status: FeedbackRecord['status']
  response: string | null
  resolved_at: string | null
  created_at: string
}

const FEEDBACK_COLUMNS =
  'id, user_id, type, message, page_url, app_version, status, response, resolved_at, created_at'

function toRecord(row: FeedbackRow): FeedbackRecord {
  return {
    id: row.id,
    userId: row.user_id,
    type: row.type,
    message: row.message,
    pageUrl: row.page_url,
    appVersion: row.app_version,
    status: row.status,
    response: row.response,
    resolvedAt: row.resolved_at,
    createdAt: row.created_at,
  }
}

/** Persist a feedback submission. Service-role client only. */
export async function insertFeedback(
  admin: SupabaseClient,
  input: InsertFeedbackInput,
): Promise<void> {
  const { error } = await admin.from(FEEDBACK_TABLE).insert({
    user_id: input.userId,
    type: input.type,
    message: input.message,
    page_url: input.pageUrl,
    app_version: input.appVersion,
    user_agent: input.userAgent,
  })
  if (error) {
    throw new AppError(502, 'Could not save feedback.', 'DB_FEEDBACK_INSERT_FAILED', error)
  }
}

/** Most recent feedback rows, newest first. Service-role client only. */
export async function listRecentFeedback(
  admin: SupabaseClient,
  limit = 50,
): Promise<FeedbackRecord[]> {
  const { data, error } = await admin
    .from(FEEDBACK_TABLE)
    .select(FEEDBACK_COLUMNS)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) {
    throw new AppError(502, 'Could not load feedback.', 'DB_FEEDBACK_LIST_FAILED', error)
  }
  return (data as FeedbackRow[]).map(toRecord)
}

/** Total feedback count. Service-role client only. */
export async function countFeedback(admin: SupabaseClient): Promise<number> {
  const { count, error } = await admin
    .from(FEEDBACK_TABLE)
    .select('id', { count: 'exact', head: true })
  if (error) {
    throw new AppError(502, 'Could not count feedback.', 'DB_FEEDBACK_COUNT_FAILED', error)
  }
  return count ?? 0
}

export interface UpdateFeedbackPatch {
  status?: FeedbackRecord['status']
  response?: string
  resolved_at?: string | null
}

/** Update a feedback row (status/response). Service-role client only. */
export async function updateFeedback(
  admin: SupabaseClient,
  id: string,
  patch: UpdateFeedbackPatch,
): Promise<FeedbackRecord> {
  const { data, error } = await admin
    .from(FEEDBACK_TABLE)
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select(FEEDBACK_COLUMNS)
    .single()
  if (error || !data) {
    throw new AppError(502, 'Could not update feedback.', 'DB_FEEDBACK_UPDATE_FAILED', error)
  }
  return toRecord(data as FeedbackRow)
}
