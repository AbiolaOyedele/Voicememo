import type { SupabaseClient } from '@supabase/supabase-js'
import { AppError } from '@/lib/errors'
import type { UserMessage, UserMessageKind } from '@/types/messages'

/**
 * All database access for `idea_dump_user_messages` — in-app messages from the
 * admin to a user. Inserts use the service-role client (admin actions); reads
 * and dismissals use the caller's RLS-scoped client, so users only ever touch
 * their own rows.
 */
const MESSAGES_TABLE = 'idea_dump_user_messages'

interface MessageRow {
  id: string
  kind: UserMessageKind
  title: string
  body: string
  created_at: string
}

export interface InsertMessageInput {
  userId: string
  kind: UserMessageKind
  title: string
  body: string
  feedbackId?: string | null
}

/** Queue a message for a user. Service-role client only. */
export async function insertMessage(
  admin: SupabaseClient,
  input: InsertMessageInput,
): Promise<void> {
  const { error } = await admin.from(MESSAGES_TABLE).insert({
    user_id: input.userId,
    kind: input.kind,
    title: input.title,
    body: input.body,
    feedback_id: input.feedbackId ?? null,
  })
  if (error) {
    throw new AppError(502, 'Could not send that message.', 'DB_MESSAGE_INSERT_FAILED', error)
  }
}

/** The user's undismissed messages, newest first. RLS-scoped client. */
export async function listUndismissedMessages(
  supabase: SupabaseClient,
  userId: string,
): Promise<UserMessage[]> {
  const { data, error } = await supabase
    .from(MESSAGES_TABLE)
    .select('id, kind, title, body, created_at')
    .eq('user_id', userId)
    .is('dismissed_at', null)
    .order('created_at', { ascending: false })
    .limit(20)
  if (error) {
    throw new AppError(502, 'Could not load your messages.', 'DB_MESSAGES_LIST_FAILED', error)
  }
  return (data as MessageRow[]).map((r) => ({
    id: r.id,
    kind: r.kind,
    title: r.title,
    body: r.body,
    createdAt: r.created_at,
  }))
}

/** Dismiss one of the user's messages. RLS-scoped client. */
export async function dismissMessage(
  supabase: SupabaseClient,
  userId: string,
  id: string,
): Promise<void> {
  const { error } = await supabase
    .from(MESSAGES_TABLE)
    .update({ dismissed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', userId)
  if (error) {
    throw new AppError(502, 'Could not dismiss that message.', 'DB_MESSAGE_DISMISS_FAILED', error)
  }
}
