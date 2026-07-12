/**
 * Domain types for dumps. Field names mirror the `dumps` table columns so rows
 * from Supabase map directly onto these shapes.
 */

/** Lifecycle status of a dump, matching the DB check constraint. */
export type DumpStatus = 'queued' | 'uploading' | 'transcribing' | 'processing' | 'ready' | 'failed'

/** Every valid dump status, in lifecycle order. */
export const DUMP_STATUSES: readonly DumpStatus[] = [
  'queued',
  'uploading',
  'transcribing',
  'processing',
  'ready',
  'failed',
]

/** A single topic-segmented block produced by the AI cleanup pass. */
export interface Segment {
  label: string
  content: string
}

/** A free-text tag on a dump. */
export type Tag = string

/** One checklist item in an action plan. */
export interface ActionPlanItem {
  id: string
  text: string
  done: boolean
}

/** A generated action-plan checklist for a dump, created on demand. */
export interface ActionPlan {
  items: ActionPlanItem[]
  generated_at: string
}

/** Maximum recording length in seconds (15 minutes), enforced client- and server-side. */
export const MAX_DURATION_SECONDS = 900

/** A voice dump as stored in the `dumps` table. */
export interface Dump {
  id: string
  user_id: string
  title: string | null
  summary: string | null
  raw_transcript: string | null
  clean_transcript: string | null
  segments: Segment[] | null
  tags: Tag[]
  action_plan: ActionPlan | null
  r2_audio_key: string | null
  duration_seconds: number
  is_pinned: boolean
  status: DumpStatus
  created_at: string
  updated_at: string
  deleted_at: string | null
}

/** A user profile as stored in the `profiles` table. */
export interface Profile {
  id: string
  full_name: string | null
  email: string
  avatar_url: string | null
  created_at: string
  updated_at: string
}
