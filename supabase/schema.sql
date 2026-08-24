-- Iron Ledger — Supabase schema
-- Run this once in your project: SQL Editor → New query → paste → Run.
--
-- One row per account holding the whole ledger as JSON. The app already
-- treats its data as a single document, so this keeps sync atomic and
-- avoids a fifteen-table migration for no user-visible gain.

create table if not exists public.ledgers (
  user_id    uuid        primary key references auth.users (id) on delete cascade,
  data       jsonb       not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- Row-level security is what actually protects the data. The anon key
-- shipped in the HTML is public by design; these policies are the fence.
alter table public.ledgers enable row level security;

drop policy if exists "own ledger: read"   on public.ledgers;
drop policy if exists "own ledger: insert" on public.ledgers;
drop policy if exists "own ledger: update" on public.ledgers;
drop policy if exists "own ledger: delete" on public.ledgers;

create policy "own ledger: read"
  on public.ledgers for select
  using (auth.uid() = user_id);

create policy "own ledger: insert"
  on public.ledgers for insert
  with check (auth.uid() = user_id);

create policy "own ledger: update"
  on public.ledgers for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "own ledger: delete"
  on public.ledgers for delete
  using (auth.uid() = user_id);

-- Keep updated_at honest even if a client forgets to send it.
create or replace function public.touch_ledger()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists ledgers_touch on public.ledgers;
create trigger ledgers_touch
  before insert or update on public.ledgers
  for each row execute function public.touch_ledger();
