-- Reminders v2: user-set reminders and persistent delivery.
--
-- 1. Reminders were one-per-dump (voice-detected only); users can now set
--    their own, up to 2 pending per idea — drop the unique constraint (the
--    per-dump cap is enforced in the service layer).
-- 2. Profiles gain a persistent_reminders preference: when on, a due
--    reminder is delivered as a burst of pushes (~10, a second apart)
--    instead of a single notification. Off by default.

alter table public.idea_dump_reminders
  drop constraint if exists idea_dump_reminders_dump_id_key;

create index if not exists idea_dump_reminders_dump_status_idx
  on public.idea_dump_reminders (dump_id, status);

alter table public.idea_dump_profiles
  add column if not exists persistent_reminders boolean not null default false;

-- Owners may update their own profile (needed for the preference toggle).
drop policy if exists "idea_dump_profiles_update_own" on public.idea_dump_profiles;
create policy "idea_dump_profiles_update_own"
  on public.idea_dump_profiles for update
  using (auth.uid() = id) with check (auth.uid() = id);
