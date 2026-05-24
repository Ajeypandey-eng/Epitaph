-- ============================================================
--  BitRot — thoughts table migration
--  Run this in the Supabase SQL Editor (Dashboard → SQL Editor)
--  or via the Supabase CLI: supabase db push
-- ============================================================

-- Enable the pgcrypto extension if not already active
-- (gen_random_uuid() lives here on older Postgres versions;
--  on Postgres 13+ it is built-in as gen_random_uuid() without extension)
create extension if not exists "pgcrypto";

-- ──────────────────────────────────────────────────────────────
--  thoughts
-- ──────────────────────────────────────────────────────────────
create table if not exists public.thoughts (
  id         uuid          primary key default gen_random_uuid(),
  content    text          not null,
  x_pos      float8        not null,
  y_pos      float8        not null,
  vitality   int4          not null default 100
                           check (vitality >= 0 and vitality <= 100),
  created_at timestamptz   not null default now()
);

-- Index for time-ordered fetches (most recent first)
create index if not exists thoughts_created_at_idx
  on public.thoughts (created_at desc);

-- ──────────────────────────────────────────────────────────────
--  Row Level Security
--  Allow all authenticated AND anonymous (anon) reads and inserts
--  so the canvas works without requiring a login.
--  Tighten these for production — e.g. restrict deletes.
-- ──────────────────────────────────────────────────────────────
alter table public.thoughts enable row level security;

-- SELECT: anyone can read all thoughts
create policy "thoughts_select_all"
  on public.thoughts
  for select
  using (true);

-- INSERT: anyone can add a thought, but it must be valid (hardened)
create policy "thoughts_insert_all"
  on public.thoughts
  for insert
  with check (
    length(content) <= 280 and 
    vitality = 100
  );

-- UPDATE: anyone can shock (lower vitality) any thought
create policy "thoughts_update_all"
  on public.thoughts
  for update
  using (true)
  with check (true);

-- ──────────────────────────────────────────────────────────────
--  Realtime publication
--  Required for .on('postgres_changes', ...) subscriptions.
-- ──────────────────────────────────────────────────────────────
-- Add the table to the supabase_realtime publication so that
-- INSERT / UPDATE / DELETE events are broadcast to subscribers.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename  = 'thoughts'
  ) then
    alter publication supabase_realtime add table public.thoughts;
  end if;
end
$$;

-- ──────────────────────────────────────────────────────────────
--  Optional seed rows (comment out if you want a blank canvas)
-- ──────────────────────────────────────────────────────────────
insert into public.thoughts (content, x_pos, y_pos, vitality)
values
  ('The universe tends toward entropy. So do ideas left unattended.', 420,  310,  88),
  ('Finish the distributed cache invalidation RFC before Friday''s review.', 1640, 900,  42),
  ('Why does nostalgia feel sharper at 2 AM?',                              2900, 2200, 14)
on conflict do nothing;
