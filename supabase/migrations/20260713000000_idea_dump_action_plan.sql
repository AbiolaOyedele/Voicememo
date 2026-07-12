-- Adds an on-demand action-plan checklist to dumps.
-- Generated lazily by the app only when the user asks to see one (from the
-- already-cleaned transcript, not re-run through the initial processing
-- pipeline) — so this column stays null for most rows. No RLS changes needed:
-- the existing per-row policies on idea_dump_dumps already cover this column.
-- Safe to run in the Supabase SQL editor.

alter table public.idea_dump_dumps
  add column if not exists action_plan jsonb;
