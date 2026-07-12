-- Idea Dump schema — namespaced for a SHARED Supabase database.
-- Every object is prefixed `idea_dump_` so it never clashes with other projects.
-- Safe to run in the Supabase SQL editor. Idempotent where practical.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Shared helper: keep updated_at current (uniquely named)
-- ---------------------------------------------------------------------------
create or replace function public.idea_dump_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- idea_dump_profiles
-- ---------------------------------------------------------------------------
create table if not exists public.idea_dump_profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  email text not null,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.idea_dump_profiles enable row level security;

drop policy if exists "idea_dump_profiles_select_own" on public.idea_dump_profiles;
create policy "idea_dump_profiles_select_own"
  on public.idea_dump_profiles for select using (auth.uid() = id);

drop policy if exists "idea_dump_profiles_insert_own" on public.idea_dump_profiles;
create policy "idea_dump_profiles_insert_own"
  on public.idea_dump_profiles for insert with check (auth.uid() = id);

drop policy if exists "idea_dump_profiles_update_own" on public.idea_dump_profiles;
create policy "idea_dump_profiles_update_own"
  on public.idea_dump_profiles for update using (auth.uid() = id) with check (auth.uid() = id);

drop trigger if exists idea_dump_profiles_set_updated_at on public.idea_dump_profiles;
create trigger idea_dump_profiles_set_updated_at
  before update on public.idea_dump_profiles
  for each row execute function public.idea_dump_set_updated_at();

-- ---------------------------------------------------------------------------
-- idea_dump_dumps  (user_id references auth.users directly for robustness)
-- ---------------------------------------------------------------------------
create table if not exists public.idea_dump_dumps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text check (char_length(title) <= 150),
  summary text check (char_length(summary) <= 300),
  raw_transcript text,
  clean_transcript text,
  segments jsonb,
  tags text[] not null default '{}',
  r2_audio_key text,
  duration_seconds integer not null check (duration_seconds >= 0 and duration_seconds <= 900),
  is_pinned boolean not null default false,
  status text not null default 'processing'
    check (status in ('queued', 'uploading', 'transcribing', 'processing', 'ready', 'failed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

alter table public.idea_dump_dumps enable row level security;

drop policy if exists "idea_dump_dumps_select_own" on public.idea_dump_dumps;
create policy "idea_dump_dumps_select_own"
  on public.idea_dump_dumps for select
  using (auth.uid() = user_id and deleted_at is null);

drop policy if exists "idea_dump_dumps_insert_own" on public.idea_dump_dumps;
create policy "idea_dump_dumps_insert_own"
  on public.idea_dump_dumps for insert with check (auth.uid() = user_id);

drop policy if exists "idea_dump_dumps_update_own" on public.idea_dump_dumps;
create policy "idea_dump_dumps_update_own"
  on public.idea_dump_dumps for update
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "idea_dump_dumps_delete_own" on public.idea_dump_dumps;
create policy "idea_dump_dumps_delete_own"
  on public.idea_dump_dumps for delete using (auth.uid() = user_id);

create index if not exists idx_idea_dump_dumps_user_created
  on public.idea_dump_dumps (user_id, created_at desc);
create index if not exists idx_idea_dump_dumps_tags
  on public.idea_dump_dumps using gin (tags);

drop trigger if exists idea_dump_dumps_set_updated_at on public.idea_dump_dumps;
create trigger idea_dump_dumps_set_updated_at
  before update on public.idea_dump_dumps
  for each row execute function public.idea_dump_set_updated_at();

-- ---------------------------------------------------------------------------
-- Auto-provision an Idea Dump profile on signup. Uniquely named so it coexists
-- with other projects' triggers on the shared auth.users table.
-- ---------------------------------------------------------------------------
create or replace function public.idea_dump_handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.idea_dump_profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    coalesce(new.raw_user_meta_data ->> 'avatar_url', new.raw_user_meta_data ->> 'picture')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists idea_dump_on_auth_user_created on auth.users;
create trigger idea_dump_on_auth_user_created
  after insert on auth.users
  for each row execute function public.idea_dump_handle_new_user();
