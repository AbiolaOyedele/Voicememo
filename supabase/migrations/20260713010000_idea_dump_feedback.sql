-- Idea Dump feedback inbox — namespaced for a SHARED Supabase database.
-- Backs the in-app "Give feedback" button. Submissions are written server-side
-- through the service-role client (so guests, who have no auth session, can
-- still send), which bypasses RLS. Owners may read back their own rows; there
-- is deliberately no broad SELECT policy — the admin reads everything via the
-- service role. This table is the durable record.

create extension if not exists pgcrypto;

create table if not exists public.idea_dump_feedback (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users (id) on delete set null,
  type       text not null default 'other' check (type in ('bug', 'feature', 'other')),
  message    text not null check (char_length(message) between 1 and 5000),
  page_url   text,
  app_version text,
  user_agent text,
  status     text not null default 'new' check (status in ('new', 'triaged', 'done')),
  created_at timestamptz not null default now()
);

create index if not exists idea_dump_feedback_created_at_idx on public.idea_dump_feedback (created_at desc);
create index if not exists idea_dump_feedback_status_idx     on public.idea_dump_feedback (status);

alter table public.idea_dump_feedback enable row level security;

-- Owners may read back only their own submissions. Inserts happen exclusively
-- through the server (service role), so no INSERT policy is granted to clients.
drop policy if exists "idea_dump_feedback_select_own" on public.idea_dump_feedback;
create policy "idea_dump_feedback_select_own"
  on public.idea_dump_feedback for select using (auth.uid() = user_id);
