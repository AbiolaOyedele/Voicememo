import type { User } from '@supabase/supabase-js'
import { createAdminSupabaseClient } from '@/lib/supabase-admin'
import { AppError } from '@/lib/errors'
import { logger } from '@/lib/logger'

/**
 * Permanently delete a user's account and all their data. Deleting the auth
 * user cascades to idea_dump_profiles and idea_dump_dumps via the `on delete
 * cascade` foreign keys in the schema — no separate row cleanup needed.
 * Recorded audio in R2 self-expires 7 days after upload regardless (see
 * storage.service.ts's bucket lifecycle rule), so nothing is orphaned there.
 */
export async function deleteAccount(user: User): Promise<void> {
  const admin = createAdminSupabaseClient()
  const { error } = await admin.auth.admin.deleteUser(user.id)
  if (error) {
    logger.error({ code: 'ACCOUNT_DELETE_FAILED', userId: user.id }, 'Failed to delete account')
    throw new AppError(
      500,
      'We could not delete your account. Try again.',
      'ACCOUNT_DELETE_FAILED',
      error,
    )
  }
}
