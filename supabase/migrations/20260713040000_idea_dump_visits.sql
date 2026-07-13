-- Anonymous visitor counter — one row per browser that has ever opened the
-- app, keyed by a random id set client-side (the dumpty_vid cookie, no PII).
-- Lets the admin dashboard show total reach, not just signups.

create extension if not exists pgcrypto;

create table if not exists public.idea_dump_visits (
  id          uuid primary key default gen_random_uuid(),
  visitor_id  uuid not null unique,
  created_at  timestamptz not null default now()
);

create index if not exists idea_dump_visits_created_at_idx
  on public.idea_dump_visits (created_at);

alter table public.idea_dump_visits enable row level security;
-- Deny-all by default (no policies): every read/write goes through the
-- service-role client (POST /api/v1/visits, admin dashboard stats).
