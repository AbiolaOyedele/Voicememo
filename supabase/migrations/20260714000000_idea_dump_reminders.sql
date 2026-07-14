-- Voice reminders: "remind me about this later" detected during AI processing,
-- delivered as a push notification via a scheduled Upstash QStash callback.

alter table public.idea_dump_dumps
  add column if not exists timezone text;

-- ---------------------------------------------------------------------------
-- idea_dump_reminders
-- ---------------------------------------------------------------------------
create table if not exists public.idea_dump_reminders (
  id uuid primary key default gen_random_uuid(),
  dump_id uuid not null unique references public.idea_dump_dumps (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  remind_at timestamptz not null,
  message text not null check (char_length(message) <= 200),
  status text not null default 'pending' check (status in ('pending', 'sent', 'cancelled')),
  qstash_message_id text,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);

alter table public.idea_dump_reminders enable row level security;

drop policy if exists "idea_dump_reminders_select_own" on public.idea_dump_reminders;
create policy "idea_dump_reminders_select_own"
  on public.idea_dump_reminders for select using (auth.uid() = user_id);

drop policy if exists "idea_dump_reminders_insert_own" on public.idea_dump_reminders;
create policy "idea_dump_reminders_insert_own"
  on public.idea_dump_reminders for insert with check (auth.uid() = user_id);

drop policy if exists "idea_dump_reminders_update_own" on public.idea_dump_reminders;
create policy "idea_dump_reminders_update_own"
  on public.idea_dump_reminders for update
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Used by the delivery callback (service-role client) to find due reminders.
create index if not exists idx_idea_dump_reminders_pending
  on public.idea_dump_reminders (remind_at) where status = 'pending';
