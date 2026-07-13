import type { SupabaseClient } from '@supabase/supabase-js'
import { AppError } from '@/lib/errors'

/**
 * All database access for web-push subscriptions. Namespaced
 * (`idea_dump_push_subscriptions`) because this app shares its Supabase
 * database. Per-user reads/writes go through the request-scoped client (RLS);
 * the admin broadcast reads every row through the service-role client.
 */
const PUSH_TABLE = 'idea_dump_push_subscriptions'

/** A stored push subscription needed to deliver a notification. */
export interface PushSubscriptionRecord {
  endpoint: string
  p256dh: string
  auth: string
}

export interface UpsertSubscriptionInput {
  userId: string
  endpoint: string
  p256dh: string
  auth: string
  userAgent: string | null
}

/**
 * Insert or refresh a subscription, keyed by its unique endpoint so a browser
 * re-subscribing updates its keys rather than creating duplicate rows.
 */
export async function upsertSubscription(
  supabase: SupabaseClient,
  input: UpsertSubscriptionInput,
): Promise<void> {
  const { error } = await supabase.from(PUSH_TABLE).upsert(
    {
      user_id: input.userId,
      endpoint: input.endpoint,
      p256dh: input.p256dh,
      auth: input.auth,
      user_agent: input.userAgent,
    },
    { onConflict: 'endpoint' },
  )
  if (error) {
    throw new AppError(502, 'Could not save the subscription.', 'DB_PUSH_UPSERT_FAILED', error)
  }
}

/** Remove a subscription by endpoint (on unsubscribe or a dead endpoint). */
export async function deleteSubscriptionByEndpoint(
  supabase: SupabaseClient,
  endpoint: string,
): Promise<void> {
  const { error } = await supabase.from(PUSH_TABLE).delete().eq('endpoint', endpoint)
  if (error) {
    throw new AppError(502, 'Could not remove the subscription.', 'DB_PUSH_DELETE_FAILED', error)
  }
}

/** Every subscription across all users. Service-role client only (broadcast). */
export async function listAllSubscriptions(
  admin: SupabaseClient,
): Promise<PushSubscriptionRecord[]> {
  const { data, error } = await admin.from(PUSH_TABLE).select('endpoint, p256dh, auth')
  if (error) {
    throw new AppError(502, 'Could not load subscribers.', 'DB_PUSH_LIST_FAILED', error)
  }
  return data as PushSubscriptionRecord[]
}

/** Count of subscriptions. Service-role client only. */
export async function countSubscriptions(admin: SupabaseClient): Promise<number> {
  const { count, error } = await admin
    .from(PUSH_TABLE)
    .select('id', { count: 'exact', head: true })
  if (error) {
    throw new AppError(502, 'Could not count subscribers.', 'DB_PUSH_COUNT_FAILED', error)
  }
  return count ?? 0
}
