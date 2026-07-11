-- Idea Dump — initial schema
-- Tables: profiles, dumps. RLS enabled on both from creation.
-- Multi-account app: every policy restricts access to auth.uid().

-- gen_random_uuid() is core in Postgres 13+ (Supabase). pgcrypto kept explicit for safety.
create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Shared: keep updated_at current on every UPDATE
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  email text not null unique,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Users may read and update only their own profile.
-- No INSERT policy: rows are created by the handle_new_user trigger (SECURITY DEFINER).
-- No DELETE policy: profiles are removed via ON DELETE CASCADE from auth.users.
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- dumps
-- ---------------------------------------------------------------------------
create table if not exists public.dumps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text check (char_length(title) <= 150),
  raw_transcript text,
  clean_transcript text,
  segments jsonb,                                  -- array of { label: string, content: string }
  tags text[] not null default '{}',
  r2_audio_key text,                               -- null after 7-day R2 auto-delete
  duration_seconds integer not null check (duration_seconds >= 0 and duration_seconds <= 900),
  is_pinned boolean not null default false,
  status text not null default 'processing'
    check (status in ('queued', 'uploading', 'transcribing', 'processing', 'ready', 'failed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

alter table public.dumps enable row level security;

-- SELECT hides soft-deleted rows. INSERT/UPDATE/DELETE are scoped to the owner.
-- WITH CHECK on UPDATE prevents reassigning a dump to another user_id.
create policy "Users can view own dumps"
  on public.dumps for select
  using (auth.uid() = user_id and deleted_at is null);

create policy "Users can insert own dumps"
  on public.dumps for insert
  with check (auth.uid() = user_id);

create policy "Users can update own dumps"
  on public.dumps for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own dumps"
  on public.dumps for delete
  using (auth.uid() = user_id);

create index if not exists idx_dumps_user_created
  on public.dumps (user_id, created_at desc);

create index if not exists idx_dumps_tags
  on public.dumps using gin (tags);

create trigger dumps_set_updated_at
  before update on public.dumps
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Auto-provision a profile row when a new auth user signs up (Google OAuth).
-- SECURITY DEFINER so it can insert past RLS. Pulls name/avatar from OAuth metadata.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    coalesce(new.raw_user_meta_data ->> 'avatar_url', new.raw_user_meta_data ->> 'picture')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
