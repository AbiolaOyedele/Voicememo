import { Client } from '@upstash/qstash'
import type { SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { env } from '@/config/env.server'
import { AppError } from '@/lib/errors'
import { logger } from '@/lib/logger'
import { createAdminSupabaseClient } from '@/lib/supabase-admin'
import { getDumpById } from '@/repositories/dumps.repository'
import { getPersistentReminders } from '@/repositories/profiles.repository'
import {
  cancelReminder,
  getPendingReminderById,
  getReminderById,
  insertReminder,
  listPendingRemindersForDump,
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

/** Up to 2 pending reminders per idea — one voice-detected plus one manual,
 * or two manual. Enforced here (the DB no longer has a unique constraint). */
const MAX_PENDING_PER_DUMP = 2

const userReminderSchema = z
  .object({
    remind_at: z.string().datetime({ offset: true }),
    message: z.string().trim().min(1).max(200).optional(),
  })
  .strict()

/**
 * Create a user-set reminder on a dump. Validates the time (must be in the
 * future, within a year) and the per-dump cap, then persists + schedules the
 * QStash delivery callback like a voice-detected reminder.
 */
export async function createUserReminder(
  supabase: SupabaseClient,
  userId: string,
  dumpId: string,
  input: unknown,
): Promise<Reminder> {
  const parsed = userReminderSchema.safeParse(input)
  if (!parsed.success) {
    throw new AppError(422, 'That reminder is not valid.', 'REMINDER_CREATE_INVALID')
  }
  const remindAt = new Date(parsed.data.remind_at)
  const now = Date.now()
  if (remindAt.getTime() < now + 60_000) {
    throw new AppError(422, 'Pick a time at least a minute from now.', 'REMINDER_TIME_PAST')
  }
  if (remindAt.getTime() > now + 366 * 24 * 60 * 60 * 1000) {
    throw new AppError(422, 'Pick a time within the next year.', 'REMINDER_TIME_TOO_FAR')
  }

  const dump = await getDumpById(supabase, userId, dumpId)
  if (!dump) {
    throw new AppError(404, 'That idea could not be found.', 'DUMP_NOT_FOUND')
  }

  const pending = await listPendingRemindersForDump(supabase, userId, dumpId)
  if (pending.length >= MAX_PENDING_PER_DUMP) {
    throw new AppError(
      422,
      'You can have up to two reminders per idea. Cancel one first.',
      'REMINDER_LIMIT_REACHED',
    )
  }

  const reminder = await insertReminder(supabase, {
    dumpId,
    userId,
    remindAt: remindAt.toISOString(),
    message: parsed.data.message ?? 'You asked to be reminded about this idea.',
  })

  const client = getQstashClient()
  const { messageId } = await client.publishJSON({
    url: `${env.NEXT_PUBLIC_SITE_URL}${DELIVER_PATH}`,
    body: { reminderId: reminder.id },
    notBefore: Math.floor(remindAt.getTime() / 1000),
  })
  await setReminderQstashId(supabase, reminder.id, messageId)
  return reminder
}

/** Cancel one reminder by id — both the QStash schedule and the DB row. */
export async function cancelReminderById(
  supabase: SupabaseClient,
  userId: string,
  reminderId: string,
): Promise<void> {
  const reminder = await getReminderById(supabase, userId, reminderId)
  if (!reminder || reminder.status !== 'pending') {
    throw new AppError(404, 'No active reminder to cancel.', 'REMINDER_NOT_FOUND')
  }

  if (reminder.qstash_message_id) {
    try {
      const client = getQstashClient()
      await client.messages.cancel(reminder.qstash_message_id)
    } catch {
      // Not fatal — deliverReminder no-ops on a non-pending reminder.
      logger.warn(
        { code: 'REMINDER_CANCEL_QSTASH_FAILED', reminderId: reminder.id },
        'Could not cancel scheduled push',
      )
    }
  }

  await cancelReminder(supabase, userId, reminder.id)
}

/** All pending reminders on a dump, soonest first. */
export function listRemindersForUser(
  supabase: SupabaseClient,
  userId: string,
  dumpId: string,
): Promise<Reminder[]> {
  return listPendingRemindersForDump(supabase, userId, dumpId)
}

/** How many burst pushes a persistent delivery sends, and how far apart. */
const PERSISTENT_PUSHES = 10
const PERSISTENT_INTERVAL_MS = 1000

/**
 * Deliver a reminder as a push notification. Called by the QStash callback
 * route once its signature is verified. Idempotent and safe to no-op: a
 * missing or non-pending reminder (already sent, cancelled, or its dump was
 * deleted — cascade removes the row) is not an error, just nothing to do.
 *
 * When the user opted into persistent reminders, the single push becomes a
 * burst: ~10 sends a second apart with the same notification tag + renotify,
 * so one notification re-rings like an alarm instead of stacking ten cards.
 */
export async function deliverReminder(reminderId: string): Promise<void> {
  const admin = createAdminSupabaseClient()
  const reminder = await getPendingReminderById(admin, reminderId)
  if (!reminder) {
    logger.info({ code: 'REMINDER_DELIVER_SKIPPED', reminderId }, 'Reminder no longer pending')
    return
  }

  const dump = await getDumpById(admin, reminder.user_id, reminder.dump_id)
  const payload = {
    title: dump?.title ?? 'Dumpty reminder',
    body: reminder.message,
    url: `/library/${reminder.dump_id}`,
  }

  const persistent = await getPersistentReminders(admin, reminder.user_id).catch(() => false)
  // Mark sent before the burst: if the function dies mid-burst, a QStash retry
  // must not restart the alarm from scratch.
  await markReminderSent(admin, reminder.id)

  if (!persistent) {
    await sendPushToUser(reminder.user_id, payload)
    return
  }

  for (let i = 0; i < PERSISTENT_PUSHES; i++) {
    await sendPushToUser(reminder.user_id, {
      ...payload,
      tag: `reminder-${reminder.id}`,
      renotify: true,
    })
    if (i < PERSISTENT_PUSHES - 1) {
      await new Promise((r) => setTimeout(r, PERSISTENT_INTERVAL_MS))
    }
  }
}

