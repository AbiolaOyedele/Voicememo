-- Admin dashboard stats. auth.users is not exposed over PostgREST, so counts
-- and recent signups are read through a SECURITY DEFINER function executable
-- ONLY by the service role (the admin dashboard calls it server-side after an
-- allowlist check). No client role can execute it.

create or replace function public.idea_dump_admin_stats()
returns json
language sql
security definer
set search_path = public, auth
as $$
  select json_build_object(
    'total_users',   (select count(*) from auth.users),
    'signups_today', (select count(*) from auth.users where created_at >= date_trunc('day', now())),
    'signups_7d',    (select count(*) from auth.users where created_at >= now() - interval '7 days'),
    'signups_30d',   (select count(*) from auth.users where created_at >= now() - interval '30 days'),
    'recent_signups', (
      select coalesce(json_agg(row_to_json(u)), '[]'::json)
      from (
        select id, email, created_at, (raw_app_meta_data->>'provider') as provider
        from auth.users
        order by created_at desc
        limit 20
      ) u
    )
  );
$$;

revoke all on function public.idea_dump_admin_stats() from public;
revoke all on function public.idea_dump_admin_stats() from anon;
revoke all on function public.idea_dump_admin_stats() from authenticated;
grant execute on function public.idea_dump_admin_stats() to service_role;
