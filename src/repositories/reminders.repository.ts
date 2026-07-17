import type { SupabaseClient } from '@supabase/supabase-js'
import type { Reminder } from '@/types/reminder'
import { AppError } from '@/lib/errors'

/**
 * All database access for the reminders table. Per-user reads/writes go
 * through the request-scoped client (RLS); the delivery callback (no user
 * session) reads/writes through the service-role client.
 */
const REMINDERS_TABLE = 'idea_dump_reminders'

export interface InsertReminderInput {
  dumpId: string
  userId: string
  remindAt: string
  message: string
}

/** Insert a new pending reminder for a dump. */
export async function insertReminder(
  supabase: SupabaseClient,
  input: InsertReminderInput,
): Promise<Reminder> {
  const { data, error } = await supabase
    .from(REMINDERS_TABLE)
    .insert({
      dump_id: input.dumpId,
      user_id: input.userId,
      remind_at: input.remindAt,
      message: input.message,
    })
    .select()
    .single()

  if (error || !data) {
    throw new AppError(500, 'We could not save that reminder.', 'DB_INSERT_REMINDER_FAILED', error)
  }
  return data as Reminder
}

/** Fetch the reminder for a dump the user owns, or null if none exists. */
export async function getReminderForDump(
  supabase: SupabaseClient,
  userId: string,
  dumpId: string,
): Promise<Reminder | null> {
  const { data, error } = await supabase
    .from(REMINDERS_TABLE)
    .select()
    .eq('dump_id', dumpId)
    .eq('user_id', userId)
    .maybeSingle()

  if (error) {
    throw new AppError(500, 'We could not load that reminder.', 'DB_GET_REMINDER_FAILED', error)
  }
  return (data as Reminder) ?? null
}

/** Fetch a pending reminder by id. Service-role client only (delivery callback). */
export async function getPendingReminderById(
  admin: SupabaseClient,
  id: string,
): Promise<Reminder | null> {
  const { data, error } = await admin
    .from(REMINDERS_TABLE)
    .select()
    .eq('id', id)
    .eq('status', 'pending')
    .maybeSingle()

  if (error) {
    throw new AppError(500, 'We could not load that reminder.', 'DB_GET_REMINDER_FAILED', error)
  }
  return (data as Reminder) ?? null
}

/** Attach the QStash message id once scheduling succeeds. */
export async function setReminderQstashId(
  supabase: SupabaseClient,
  id: string,
  qstashMessageId: string,
): Promise<void> {
  const { error } = await supabase
    .from(REMINDERS_TABLE)
    .update({ qstash_message_id: qstashMessageId })
    .eq('id', id)

  if (error) {
    throw new AppError(500, 'We could not schedule that reminder.', 'DB_UPDATE_REMINDER_FAILED', error)
  }
}

/** Mark a reminder delivered. Service-role client only (delivery callback). */
export async function markReminderSent(admin: SupabaseClient, id: string): Promise<void> {
  const { error } = await admin
    .from(REMINDERS_TABLE)
    .update({ status: 'sent', sent_at: new Date().toISOString() })
    .eq('id', id)

  if (error) {
    throw new AppError(500, 'We could not update that reminder.', 'DB_UPDATE_REMINDER_FAILED', error)
  }
}

/** Cancel a reminder the user owns. */
export async function cancelReminder(
  supabase: SupabaseClient,
  userId: string,
  id: string,
): Promise<void> {
  const { error } = await supabase
    .from(REMINDERS_TABLE)
    .update({ status: 'cancelled' })
    .eq('id', id)
    .eq('user_id', userId)

  if (error) {
    throw new AppError(500, 'We could not cancel that reminder.', 'DB_CANCEL_REMINDER_FAILED', error)
  }
}

/** All pending reminders for a dump the user owns, soonest first. */
export async function listPendingRemindersForDump(
  supabase: SupabaseClient,
  userId: string,
  dumpId: string,
): Promise<Reminder[]> {
  const { data, error } = await supabase
    .from(REMINDERS_TABLE)
    .select()
    .eq('dump_id', dumpId)
    .eq('user_id', userId)
    .eq('status', 'pending')
    .order('remind_at', { ascending: true })

  if (error) {
    throw new AppError(500, 'We could not load reminders.', 'DB_LIST_REMINDERS_FAILED', error)
  }
  return (data as Reminder[]) ?? []
}

/** Fetch one reminder by id that the user owns, or null. */
export async function getReminderById(
  supabase: SupabaseClient,
  userId: string,
  id: string,
): Promise<Reminder | null> {
  const { data, error } = await supabase
    .from(REMINDERS_TABLE)
    .select()
    .eq('id', id)
    .eq('user_id', userId)
    .maybeSingle()

  if (error) {
    throw new AppError(500, 'We could not load that reminder.', 'DB_GET_REMINDER_FAILED', error)
  }
  return (data as Reminder) ?? null
}
