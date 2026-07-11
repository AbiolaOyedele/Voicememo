import type { SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'
import type { Dump } from '@/types/dump'
import { AppError } from '@/lib/errors'
import {
  getDumpById,
  listDumps,
  softDeleteDump,
  updateDump,
  type UpdateDumpPatch,
} from '@/repositories/dumps.repository'

/**
 * Business logic for dumps. Validates input, enforces ownership via the
 * repository's user-scoped queries, and shapes results. Throws AppError for
 * expected failures.
 */

const updateSchema = z
  .object({
    title: z.string().trim().max(150).nullable().optional(),
    tags: z.array(z.string().trim().min(1).max(40)).max(20).optional(),
    is_pinned: z.boolean().optional(),
  })
  .strict()

export type UpdateDumpRequest = z.infer<typeof updateSchema>

/** List all of the user's dumps (pinned first, newest first). */
export function listDumpsForUser(supabase: SupabaseClient, userId: string): Promise<Dump[]> {
  return listDumps(supabase, userId)
}

/** Fetch one dump the user owns, or throw 404. */
export async function getDumpForUser(
  supabase: SupabaseClient,
  userId: string,
  id: string,
): Promise<Dump> {
  const dump = await getDumpById(supabase, userId, id)
  if (!dump) {
    throw new AppError(404, 'That idea could not be found.', 'DUMP_NOT_FOUND')
  }
  return dump
}

/** Validate and apply an update to a dump the user owns. */
export async function updateDumpForUser(
  supabase: SupabaseClient,
  userId: string,
  id: string,
  input: unknown,
): Promise<Dump> {
  const parsed = updateSchema.safeParse(input)
  if (!parsed.success) {
    throw new AppError(
      422,
      'Those changes are not valid.',
      'DUMP_UPDATE_INVALID',
      parsed.error.flatten(),
    )
  }

  const patch: UpdateDumpPatch = {}
  if (parsed.data.title !== undefined) patch.title = parsed.data.title
  if (parsed.data.tags !== undefined) patch.tags = parsed.data.tags
  if (parsed.data.is_pinned !== undefined) patch.is_pinned = parsed.data.is_pinned

  if (Object.keys(patch).length === 0) {
    return getDumpForUser(supabase, userId, id)
  }
  return updateDump(supabase, userId, id, patch)
}

/** Soft-delete a dump the user owns. */
export async function deleteDumpForUser(
  supabase: SupabaseClient,
  userId: string,
  id: string,
): Promise<void> {
  // Ensure it exists and is owned before deleting (clear 404 otherwise).
  await getDumpForUser(supabase, userId, id)
  await softDeleteDump(supabase, userId, id)
}
