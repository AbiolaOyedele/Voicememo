import type { SupabaseClient } from '@supabase/supabase-js'
import { dismissMessage, listUndismissedMessages } from '@/repositories/messages.repository'
import type { UserMessage } from '@/types/messages'

/**
 * In-app messages (admin → user). Thin pass-throughs — ownership is enforced
 * by RLS plus the explicit user scoping in the repository.
 */

/** The signed-in user's undismissed messages, newest first. */
export function listMyMessages(supabase: SupabaseClient, userId: string): Promise<UserMessage[]> {
  return listUndismissedMessages(supabase, userId)
}

/** Dismiss one of the signed-in user's messages. */
export function dismissMyMessage(
  supabase: SupabaseClient,
  userId: string,
  id: string,
): Promise<void> {
  return dismissMessage(supabase, userId, id)
}
