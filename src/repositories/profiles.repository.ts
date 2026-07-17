import type { SupabaseClient } from '@supabase/supabase-js'
import { AppError } from '@/lib/errors'

/**
 * All database access for the profiles table. RLS scopes owners to their own
 * row; the reminder delivery callback reads preferences through the
 * service-role client (no user session there).
 */
const PROFILES_TABLE = 'idea_dump_profiles'

/** Whether the user opted into persistent (burst) reminder delivery. */
export async function getPersistentReminders(
  client: SupabaseClient,
  userId: string,
): Promise<boolean> {
  const { data, error } = await client
    .from(PROFILES_TABLE)
    .select('persistent_reminders')
    .eq('id', userId)
    .maybeSingle()
  if (error) {
    throw new AppError(500, 'We could not load your settings.', 'DB_PROFILE_READ_FAILED', error)
  }
  return Boolean((data as { persistent_reminders?: boolean } | null)?.persistent_reminders)
}

/** Set the persistent-reminders preference on the user's own profile row. */
export async function setPersistentReminders(
  supabase: SupabaseClient,
  userId: string,
  enabled: boolean,
): Promise<void> {
  const { error } = await supabase
    .from(PROFILES_TABLE)
    .update({ persistent_reminders: enabled, updated_at: new Date().toISOString() })
    .eq('id', userId)
  if (error) {
    throw new AppError(500, 'We could not save that setting.', 'DB_PROFILE_UPDATE_FAILED', error)
  }
}
