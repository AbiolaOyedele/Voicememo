import webpush from 'web-push'
import { z } from 'zod'
import type { SupabaseClient } from '@supabase/supabase-js'
import { env } from '@/config/env.server'
import { AppError } from '@/lib/errors'
import { logger } from '@/lib/logger'
import { createAdminSupabaseClient } from '@/lib/supabase-admin'
import {
  deleteSubscriptionByEndpoint,
  listAllSubscriptions,
  listSubscriptionsByUserId,
  upsertSubscription,
} from '@/repositories/push.repository'

/** Client-sent PushSubscription shape (the browser's subscription.toJSON()). */
const subscriptionSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
})

/** Admin broadcast payload. */
const broadcastSchema = z.object({
  title: z.string().trim().min(1, 'Add a title.').max(80),
  body: z.string().trim().min(1, 'Add a message.').max(300),
  url: z.string().trim().max(2000).optional().nullable(),
})

let configured = false

/** Configure web-push with VAPID details once. Throws if keys are missing. */
function ensureConfigured(): void {
  if (configured) return
  if (!env.VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY) {
    throw new AppError(503, 'Push notifications are not configured.', 'PUSH_NOT_CONFIGURED')
  }
  webpush.setVapidDetails(env.VAPID_SUBJECT, env.VAPID_PUBLIC_KEY, env.VAPID_PRIVATE_KEY)
  configured = true
}

/**
 * Save (or refresh) the caller's push subscription. `input` is the untrusted
 * client body; ownership comes from the request-scoped client + userId.
 */
export async function saveSubscription(
  supabase: SupabaseClient,
  userId: string,
  input: unknown,
  userAgent: string | null,
): Promise<void> {
  const parsed = subscriptionSchema.safeParse(input)
  if (!parsed.success) {
    throw new AppError(400, 'That subscription was invalid.', 'PUSH_SUBSCRIBE_INVALID')
  }
  await upsertSubscription(supabase, {
    userId,
    endpoint: parsed.data.endpoint,
    p256dh: parsed.data.keys.p256dh,
    auth: parsed.data.keys.auth,
    userAgent,
  })
}

/** Remove the caller's subscription by endpoint. */
export async function removeSubscription(
  supabase: SupabaseClient,
  input: unknown,
): Promise<void> {
  const parsed = z.object({ endpoint: z.string().url() }).safeParse(input)
  if (!parsed.success) {
    throw new AppError(400, 'That subscription was invalid.', 'PUSH_UNSUBSCRIBE_INVALID')
  }
  await removeSubscriptionByEndpoint(supabase, parsed.data.endpoint)
}

/** Internal: delete via the request-scoped client (RLS-scoped to the owner). */
async function removeSubscriptionByEndpoint(
  supabase: SupabaseClient,
  endpoint: string,
): Promise<void> {
  await deleteSubscriptionByEndpoint(supabase, endpoint)
}

export interface BroadcastResult {
  sent: number
  failed: number
  pruned: number
  total: number
}

/**
 * Send a notification to every subscriber. Admin-only — the caller must have
 * asserted admin access. Dead endpoints (404/410) are pruned as we go. `input`
 * is the untrusted admin-composed body.
 */
export async function broadcastPush(input: unknown): Promise<BroadcastResult> {
  ensureConfigured()
  const parsed = broadcastSchema.safeParse(input)
  if (!parsed.success) {
    throw new AppError(
      400,
      parsed.error.issues[0]?.message ?? 'That notification was invalid.',
      'PUSH_BROADCAST_INVALID',
    )
  }

  const admin = createAdminSupabaseClient()
  const subs = await listAllSubscriptions(admin)
  const payload = JSON.stringify({
    title: parsed.data.title,
    body: parsed.data.body,
    url: parsed.data.url || '/',
  })

  let sent = 0
  let failed = 0
  let pruned = 0

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload,
        )
        sent += 1
      } catch (error) {
        failed += 1
        const statusCode =
          typeof error === 'object' && error !== null && 'statusCode' in error
            ? (error as { statusCode?: number }).statusCode
            : undefined
        // 404/410 mean the subscription is permanently gone — prune it.
        if (statusCode === 404 || statusCode === 410) {
          await deleteSubscriptionByEndpoint(admin, sub.endpoint).catch(() => {})
          pruned += 1
        }
      }
    }),
  )

  logger.info({ sent, failed, pruned, total: subs.length }, 'Push broadcast complete')
  return { sent, failed, pruned, total: subs.length }
}

/** A push notification's content — title, body, and the URL to open on tap. */
export interface PushPayload {
  title: string
  body: string
  url: string
}

/**
 * Send a notification to every device one user has subscribed on (e.g. a
 * reminder). Dead endpoints (404/410) are pruned as we go, same as
 * {@link broadcastPush}. Not an error if the user has no subscriptions —
 * callers that need to know can inspect the returned counts.
 */
export async function sendPushToUser(userId: string, payload: PushPayload): Promise<void> {
  ensureConfigured()
  const admin = createAdminSupabaseClient()
  const subs = await listSubscriptionsByUserId(admin, userId)
  const body = JSON.stringify(payload)

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          body,
        )
      } catch (error) {
        const statusCode =
          typeof error === 'object' && error !== null && 'statusCode' in error
            ? (error as { statusCode?: number }).statusCode
            : undefined
        if (statusCode === 404 || statusCode === 410) {
          await deleteSubscriptionByEndpoint(admin, sub.endpoint).catch(() => {})
        }
      }
    }),
  )
}
