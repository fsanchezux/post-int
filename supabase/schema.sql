-- Post-In't Supabase schema
-- Run this once in the Supabase SQL editor.

create extension if not exists "pgcrypto";

-- One row per user holding their entire projects blob.
-- The blob mirrors the localStorage shape so the client can sync it as a unit
-- (last-write-wins per user). This keeps the migration from local-only simple.
create table if not exists public.user_state (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  projects    jsonb not null default '[]'::jsonb,
  history     jsonb not null default '[]'::jsonb,
  settings    jsonb,
  mood        text,
  updated_at  timestamptz not null default now()
);

alter table public.user_state enable row level security;

-- RLS: each user can only read / write their own row.
drop policy if exists "user_state_select_own" on public.user_state;
create policy "user_state_select_own"
  on public.user_state for select
  using (auth.uid() = user_id);

drop policy if exists "user_state_insert_own" on public.user_state;
create policy "user_state_insert_own"
  on public.user_state for insert
  with check (auth.uid() = user_id);

drop policy if exists "user_state_update_own" on public.user_state;
create policy "user_state_update_own"
  on public.user_state for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Touch updated_at on every update so the client can detect remote changes.
create or replace function public.user_state_touch()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists user_state_touch on public.user_state;
create trigger user_state_touch
  before update on public.user_state
  for each row execute function public.user_state_touch();
