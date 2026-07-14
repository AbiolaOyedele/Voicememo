import type { SupabaseClient, User } from '@supabase/supabase-js'
import { createAdminSupabaseClient } from '@/lib/supabase-admin'
import { AppError } from '@/lib/errors'
import { logger } from '@/lib/logger'
import { listDumps } from '@/repositories/dumps.repository'
import type { ActionPlan, DumpStatus, Segment } from '@/types/dump'

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

/** A user's notes as included in a data export. */
export interface AccountExportDump {
  id: string
  title: string | null
  summary: string | null
  rawTranscript: string | null
  cleanTranscript: string | null
  segments: Segment[] | null
  tags: string[]
  actionPlan: ActionPlan | null
  durationSeconds: number
  isPinned: boolean
  status: DumpStatus
  createdAt: string
  updatedAt: string
}

/** Full self-service data export for a signed-in user (GDPR Art. 15/20). */
export interface AccountExport {
  exportedAt: string
  account: {
    id: string
    email: string | null
    fullName: string | null
    createdAt: string
  }
  dumps: AccountExportDump[]
}

/**
 * Build a complete export of a user's account and notes as plain data — the
 * self-service "download my data" flow (right of access + portability).
 * Scoped to the same notes the user sees in their Library (excludes notes
 * already deleted, which is what "my data" means from the user's side).
 */
export async function exportAccountData(supabase: SupabaseClient, user: User): Promise<AccountExport> {
  const dumps = await listDumps(supabase, user.id)
  const meta = user.user_metadata as Record<string, unknown> | undefined
  const fullName =
    (typeof meta?.full_name === 'string' ? meta.full_name : null) ??
    (typeof meta?.name === 'string' ? meta.name : null)

  return {
    exportedAt: new Date().toISOString(),
    account: {
      id: user.id,
      email: user.email ?? null,
      fullName,
      createdAt: user.created_at,
    },
    dumps: dumps.map((d) => ({
      id: d.id,
      title: d.title,
      summary: d.summary,
      rawTranscript: d.raw_transcript,
      cleanTranscript: d.clean_transcript,
      segments: d.segments,
      tags: d.tags,
      actionPlan: d.action_plan,
      durationSeconds: d.duration_seconds,
      isPinned: d.is_pinned,
      status: d.status,
      createdAt: d.created_at,
      updatedAt: d.updated_at,
    })),
  }
}
