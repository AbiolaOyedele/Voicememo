/**
 * Domain types for reminders. Field names mirror the `idea_dump_reminders`
 * table columns so rows from Supabase map directly onto these shapes.
 */

/** Lifecycle status of a reminder, matching the DB check constraint. */
export type ReminderStatus = 'pending' | 'sent' | 'cancelled'

/** A "remind me about this later" reminder detected on a dump. */
export interface Reminder {
  id: string
  dump_id: string
  user_id: string
  remind_at: string
  message: string
  status: ReminderStatus
  qstash_message_id: string | null
  created_at: string
  sent_at: string | null
}
