-- Splitty schema. Each row stores its app-level object as JSONB in `data`
-- (matching the TypeScript types in src/types.ts) so the client and schema
-- can evolve together without a migration for every field. Row Level
-- Security restricts every table to its owning user; the Stripe webhook
-- (api/stripe-webhook.ts) writes with the service role key, which bypasses
-- RLS by design.

create table if not exists public.bills (
  id uuid primary key,
  owner_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  data jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists public.receipts (
  id uuid primary key,
  owner_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  data jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists public.subscriptions (
  id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.bills enable row level security;
alter table public.receipts enable row level security;
alter table public.subscriptions enable row level security;

create policy "Bills are owner-only" on public.bills
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy "Receipts are owner-only" on public.receipts
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy "Subscriptions are owner-only read" on public.subscriptions
  for select using (id = auth.uid());

-- Only the service role (used by the Stripe webhook) may write subscriptions.
create policy "Subscriptions are service-role write" on public.subscriptions
  for insert with check (auth.role() = 'service_role');
create policy "Subscriptions are service-role update" on public.subscriptions
  for update using (auth.role() = 'service_role');

create index if not exists bills_owner_idx on public.bills(owner_id, created_at desc);
create index if not exists receipts_owner_idx on public.receipts(owner_id, created_at desc);
