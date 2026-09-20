-- Contacts + friendship groups, so a bill's People list can be started from
-- people you've split with before instead of retyping names every time.
-- Same JSONB-payload pattern as bills/receipts in 0001_init.sql.

create table if not exists public.contacts (
  id uuid primary key,
  owner_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  data jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists public.friend_groups (
  id uuid primary key,
  owner_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  data jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.contacts enable row level security;
alter table public.friend_groups enable row level security;

create policy "Contacts are owner-only" on public.contacts
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy "Friend groups are owner-only" on public.friend_groups
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create index if not exists contacts_owner_idx on public.contacts(owner_id, created_at asc);
create index if not exists friend_groups_owner_idx on public.friend_groups(owner_id, created_at asc);
