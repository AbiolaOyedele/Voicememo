import type { SupabaseClient } from '@supabase/supabase-js'
import type { Dump, DumpStatus, Segment } from '@/types/dump'
import { AppError } from '@/lib/errors'

/**
 * All database access for the dumps table. Every query filters by `user_id`
 * (defense in depth on top of RLS). Nothing but queries lives here.
 *
 * The table is namespaced (`idea_dump_dumps`) because this app shares its
 * Supabase database with other projects.
 */
const DUMPS_TABLE = 'idea_dump_dumps'

export interface CreateDumpInput {
  userId: string
  durationSeconds: number
  r2AudioKey?: string | null
  status?: DumpStatus
}

export interface UpdateDumpPatch {
  title?: string | null
  summary?: string | null
  tags?: string[]
  is_pinned?: boolean
  status?: DumpStatus
  raw_transcript?: string | null
  clean_transcript?: string | null
  segments?: Segment[] | null
  r2_audio_key?: string | null
}

/** Insert a new dump owned by `userId`. */
export async function insertDump(supabase: SupabaseClient, input: CreateDumpInput): Promise<Dump> {
  const { data, error } = await supabase
    .from(DUMPS_TABLE)
    .insert({
      user_id: input.userId,
      duration_seconds: input.durationSeconds,
      r2_audio_key: input.r2AudioKey ?? null,
      status: input.status ?? 'processing',
    })
    .select()
    .single()

  if (error || !data) {
    throw new AppError(500, 'We could not save your recording.', 'DB_INSERT_DUMP_FAILED', error)
  }
  return data as Dump
}

/** List a user's non-deleted dumps, pinned first then most recent. */
export async function listDumps(supabase: SupabaseClient, userId: string): Promise<Dump[]> {
  const { data, error } = await supabase
    .from(DUMPS_TABLE)
    .select()
    .eq('user_id', userId)
    .is('deleted_at', null)
    .order('is_pinned', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) {
    throw new AppError(500, 'We could not load your library.', 'DB_LIST_DUMPS_FAILED', error)
  }
  return (data ?? []) as Dump[]
}

/** Fetch a single dump the user owns, or null if not found. */
export async function getDumpById(
  supabase: SupabaseClient,
  userId: string,
  id: string,
): Promise<Dump | null> {
  const { data, error } = await supabase
    .from(DUMPS_TABLE)
    .select()
    .eq('id', id)
    .eq('user_id', userId)
    .is('deleted_at', null)
    .maybeSingle()

  if (error) {
    throw new AppError(500, 'We could not load that idea.', 'DB_GET_DUMP_FAILED', error)
  }
  return (data as Dump) ?? null
}

/** Update fields on a dump the user owns. */
export async function updateDump(
  supabase: SupabaseClient,
  userId: string,
  id: string,
  patch: UpdateDumpPatch,
): Promise<Dump> {
  const { data, error } = await supabase
    .from(DUMPS_TABLE)
    .update(patch)
    .eq('id', id)
    .eq('user_id', userId)
    .is('deleted_at', null)
    .select()
    .single()

  if (error || !data) {
    throw new AppError(404, 'That idea could not be found.', 'DB_UPDATE_DUMP_FAILED', error)
  }
  return data as Dump
}

/** Soft-delete a dump the user owns. */
export async function softDeleteDump(
  supabase: SupabaseClient,
  userId: string,
  id: string,
): Promise<void> {
  const { error } = await supabase
    .from(DUMPS_TABLE)
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', userId)

  if (error) {
    throw new AppError(500, 'We could not delete that idea.', 'DB_DELETE_DUMP_FAILED', error)
  }
}
