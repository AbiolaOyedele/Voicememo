-- Idea Dump web-push subscriptions — namespaced for a SHARED Supabase database.
-- One row per browser/device push subscription. Written by the owning user
-- through their request-scoped client (RLS below), and read in bulk by the
-- admin via the service role when broadcasting a push.

create extension if not exists pgcrypto;

create table if not exists public.idea_dump_push_subscriptions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  -- The push service endpoint uniquely identifies a subscription; upsert on it
  -- so re-subscribing the same browser refreshes keys instead of duplicating.
  endpoint    text not null unique,
  p256dh      text not null,
  auth        text not null,
  user_agent  text,
  created_at  timestamptz not null default now()
);

create index if not exists idea_dump_push_subscriptions_user_id_idx
  on public.idea_dump_push_subscriptions (user_id);

alter table public.idea_dump_push_subscriptions enable row level security;

-- Owners fully manage only their own subscriptions. The admin broadcast reads
-- every row via the service role, which bypasses RLS.
drop policy if exists "idea_dump_push_subscriptions_select_own" on public.idea_dump_push_subscriptions;
create policy "idea_dump_push_subscriptions_select_own"
  on public.idea_dump_push_subscriptions for select using (auth.uid() = user_id);

drop policy if exists "idea_dump_push_subscriptions_insert_own" on public.idea_dump_push_subscriptions;
create policy "idea_dump_push_subscriptions_insert_own"
  on public.idea_dump_push_subscriptions for insert with check (auth.uid() = user_id);

drop policy if exists "idea_dump_push_subscriptions_update_own" on public.idea_dump_push_subscriptions;
create policy "idea_dump_push_subscriptions_update_own"
  on public.idea_dump_push_subscriptions for update using (auth.uid() = user_id);

drop policy if exists "idea_dump_push_subscriptions_delete_own" on public.idea_dump_push_subscriptions;
create policy "idea_dump_push_subscriptions_delete_own"
  on public.idea_dump_push_subscriptions for delete using (auth.uid() = user_id);
