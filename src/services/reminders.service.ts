import { Client } from '@upstash/qstash'
import type { SupabaseClient } from '@supabase/supabase-js'
import { env } from '@/config/env.server'
import { AppError } from '@/lib/errors'
import { logger } from '@/lib/logger'
import { createAdminSupabaseClient } from '@/lib/supabase-admin'
import { getDumpById } from '@/repositories/dumps.repository'
import {
  cancelReminder,
  getPendingReminderById,
  getReminderForDump,
  insertReminder,
  markReminderSent,
  setReminderQstashId,
} from '@/repositories/reminders.repository'
import { sendPushToUser } from '@/services/push.service'
import type { Reminder } from '@/types/reminder'

/**
 * Business logic for voice reminders: schedule a QStash callback for a
 * detected reminder, deliver it as a push when the callback fires, and
 * cancel it on request. QStash (not Vercel Cron) delivers these — Vercel's
 * Hobby plan only runs cron jobs once a day, which can't service a
 * same-day reminder; QStash schedules an exact one-off callback instead.
 */

const DELIVER_PATH = '/api/v1/reminders/deliver'

/** Lazily build the QStash client. Throws if the token isn't configured. */
function getQstashClient(): Client {
  if (!env.QSTASH_TOKEN) {
    throw new AppError(503, 'Reminders are not configured.', 'REMINDERS_NOT_CONFIGURED')
  }
  return new Client({ token: env.QSTASH_TOKEN, ...(env.QSTASH_URL ? { baseUrl: env.QSTASH_URL } : {}) })
}

export interface CreateReminderInput {
  remindAt: string
  message: string
}

/**
 * Persist a pending reminder and schedule its delivery callback. Callers
 * should treat this as best-effort — a QStash outage must never fail the
 * dump processing it's attached to.
 */
export async function createReminderForDump(
  supabase: SupabaseClient,
  userId: string,
  dumpId: string,
  input: CreateReminderInput,
): Promise<void> {
  const reminder = await insertReminder(supabase, {
    dumpId,
    userId,
    remindAt: input.remindAt,
    message: input.message,
  })

  const client = getQstashClient()
  const { messageId } = await client.publishJSON({
    url: `${env.NEXT_PUBLIC_SITE_URL}${DELIVER_PATH}`,
    body: { reminderId: reminder.id },
    notBefore: Math.floor(new Date(input.remindAt).getTime() / 1000),
  })
  await setReminderQstashId(supabase, reminder.id, messageId)
}

/**
 * Deliver a reminder as a push notification. Called by the QStash callback
 * route once its signature is verified. Idempotent and safe to no-op: a
 * missing or non-pending reminder (already sent, cancelled, or its dump was
 * deleted — cascade removes the row) is not an error, just nothing to do.
 */
export async function deliverReminder(reminderId: string): Promise<void> {
  const admin = createAdminSupabaseClient()
  const reminder = await getPendingReminderById(admin, reminderId)
  if (!reminder) {
    logger.info({ code: 'REMINDER_DELIVER_SKIPPED', reminderId }, 'Reminder no longer pending')
    return
  }

  const dump = await getDumpById(admin, reminder.user_id, reminder.dump_id)
  await sendPushToUser(reminder.user_id, {
    title: dump?.title ?? 'Dumpty reminder',
    body: reminder.message,
    url: `/library/${reminder.dump_id}`,
  })
  await markReminderSent(admin, reminder.id)
}

/** Cancel a dump's pending reminder — both the QStash schedule and the DB row. */
export async function cancelReminderForDump(
  supabase: SupabaseClient,
  userId: string,
  dumpId: string,
): Promise<void> {
  const reminder = await getReminderForDump(supabase, userId, dumpId)
  if (!reminder || reminder.status !== 'pending') {
    throw new AppError(404, 'No active reminder for this idea.', 'REMINDER_NOT_FOUND')
  }

  if (reminder.qstash_message_id) {
    try {
      const client = getQstashClient()
      await client.messages.cancel(reminder.qstash_message_id)
    } catch {
      // Not fatal — deliverReminder no-ops on a non-pending reminder, so a
      // stray callback after a failed QStash cancel is still harmless.
      logger.warn(
        { code: 'REMINDER_CANCEL_QSTASH_FAILED', reminderId: reminder.id },
        'Could not cancel scheduled push',
      )
    }
  }

  await cancelReminder(supabase, userId, reminder.id)
}

/** Fetch the reminder for a dump the user owns, or null if none exists. */
export function getReminderForUser(
  supabase: SupabaseClient,
  userId: string,
  dumpId: string,
): Promise<Reminder | null> {
  return getReminderForDump(supabase, userId, dumpId)
}
