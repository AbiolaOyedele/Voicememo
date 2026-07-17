-- Admin analytics + feedback follow-up.
--
-- 1. Feedback gains an admin response and a resolved timestamp so the admin
--    panel can work it like a todo list.
-- 2. New idea_dump_user_messages: in-app messages from the admin to a user
--    (feedback replies, announcements), shown in the Account tab until the
--    user dismisses them. Written server-side (service role); users may read
--    and dismiss only their own.
-- 3. SECURITY DEFINER stat functions for the admin dashboard: daily series
--    (signups / visitors / recordings), lifetime dump totals including total
--    recorded seconds, and per-user analytics. Service role only, same model
--    as idea_dump_admin_stats.

-- ---------------------------------------------------------------------------
-- 1. Feedback follow-up columns
-- ---------------------------------------------------------------------------

alter table public.idea_dump_feedback
  add column if not exists response text check (response is null or char_length(response) <= 2000),
  add column if not exists resolved_at timestamptz,
  add column if not exists updated_at timestamptz not null default now();

-- ---------------------------------------------------------------------------
-- 2. User messages (admin → user inbox)
-- ---------------------------------------------------------------------------

create table if not exists public.idea_dump_user_messages (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  kind        text not null default 'announcement'
              check (kind in ('feedback_reply', 'announcement')),
  title       text not null check (char_length(title) between 1 and 120),
  body        text not null check (char_length(body) between 1 and 2000),
  feedback_id uuid references public.idea_dump_feedback (id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  dismissed_at timestamptz
);

create index if not exists idea_dump_user_messages_user_idx
  on public.idea_dump_user_messages (user_id, dismissed_at, created_at desc);

alter table public.idea_dump_user_messages enable row level security;

-- Users read their own messages…
drop policy if exists "idea_dump_user_messages_select_own" on public.idea_dump_user_messages;
create policy "idea_dump_user_messages_select_own"
  on public.idea_dump_user_messages for select using (auth.uid() = user_id);

-- …and may update (dismiss) their own. Inserts happen only via service role.
drop policy if exists "idea_dump_user_messages_update_own" on public.idea_dump_user_messages;
create policy "idea_dump_user_messages_update_own"
  on public.idea_dump_user_messages for update
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- 3. Admin stat functions (service role only)
-- ---------------------------------------------------------------------------

-- Daily series for the growth chart: one row per day for the last `days` days
-- (including today), zero-filled so charts have a continuous axis.
create or replace function public.idea_dump_admin_daily_stats(days int default 30)
returns json
language sql
security definer
set search_path = public, auth
as $$
  with series as (
    select generate_series(
      date_trunc('day', now()) - make_interval(days => days - 1),
      date_trunc('day', now()),
      interval '1 day'
    )::date as day
  )
  select coalesce(json_agg(json_build_object(
    'day', s.day,
    'signups',    coalesce(u.n, 0),
    'visitors',   coalesce(v.n, 0),
    'recordings', coalesce(d.n, 0)
  ) order by s.day), '[]'::json)
  from series s
  left join (
    select created_at::date as day, count(*) as n from auth.users group by 1
  ) u on u.day = s.day
  left join (
    select created_at::date as day, count(*) as n from public.idea_dump_visits group by 1
  ) v on v.day = s.day
  left join (
    select created_at::date as day, count(*) as n from public.idea_dump_dumps group by 1
  ) d on d.day = s.day;
$$;

-- Lifetime dump totals: counts by outcome plus total recorded seconds.
-- Includes soft-deleted dumps — these are lifetime usage numbers.
create or replace function public.idea_dump_admin_dump_totals()
returns json
language sql
security definer
set search_path = public
as $$
  select json_build_object(
    'total',          count(*),
    'total_seconds',  coalesce(sum(duration_seconds), 0),
    'ready',          count(*) filter (where status = 'ready'),
    'failed',         count(*) filter (where status = 'failed'),
    'in_flight',      count(*) filter (where status not in ('ready', 'failed')),
    'transcribed',    count(*) filter (where raw_transcript is not null),
    'action_plans',   count(*) filter (where action_plan is not null)
  )
  from public.idea_dump_dumps;
$$;

-- Per-user analytics: lifetime usage per account, most active first. The raw
-- ingredients for future credit/subscription decisions.
create or replace function public.idea_dump_admin_user_analytics(max_rows int default 100)
returns json
language sql
security definer
set search_path = public, auth
as $$
  select coalesce(json_agg(row_to_json(t)), '[]'::json)
  from (
    select
      u.id,
      u.email,
      u.created_at as signed_up_at,
      count(d.id)                                                as ideas,
      coalesce(sum(d.duration_seconds), 0)                       as total_seconds,
      count(d.id) filter (where d.raw_transcript is not null)    as transcribed,
      count(d.id) filter (where d.action_plan is not null)       as action_plans,
      count(d.id) filter (where d.status = 'failed')             as failed,
      max(d.created_at)                                          as last_recording_at
    from auth.users u
    left join public.idea_dump_dumps d on d.user_id = u.id
    group by u.id, u.email, u.created_at
    order by count(d.id) desc, u.created_at desc
    limit max_rows
  ) t;
$$;

revoke all on function public.idea_dump_admin_daily_stats(int) from public;
revoke all on function public.idea_dump_admin_daily_stats(int) from anon;
revoke all on function public.idea_dump_admin_daily_stats(int) from authenticated;
grant execute on function public.idea_dump_admin_daily_stats(int) to service_role;

revoke all on function public.idea_dump_admin_dump_totals() from public;
revoke all on function public.idea_dump_admin_dump_totals() from anon;
revoke all on function public.idea_dump_admin_dump_totals() from authenticated;
grant execute on function public.idea_dump_admin_dump_totals() to service_role;

revoke all on function public.idea_dump_admin_user_analytics(int) from public;
revoke all on function public.idea_dump_admin_user_analytics(int) from anon;
revoke all on function public.idea_dump_admin_user_analytics(int) from authenticated;
grant execute on function public.idea_dump_admin_user_analytics(int) to service_role;
