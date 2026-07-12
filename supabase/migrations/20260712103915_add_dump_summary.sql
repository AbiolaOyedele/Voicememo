-- Add a one-sentence AI summary to dumps, shown in the library list.
alter table public.dumps
  add column if not exists summary text check (char_length(summary) <= 300);
