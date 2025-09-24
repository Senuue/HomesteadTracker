-- Local PostgreSQL schema for Homestead Tracker
-- Apply with: psql -U <user> -d homestead_tracker -f db/local_postgres.sql

create extension if not exists pgcrypto;

create table if not exists public.chickens (
  id uuid primary key default gen_random_uuid(),
  batch_name text not null,
  initial_count integer not null check (initial_count >= 0),
  current_count integer not null check (current_count >= 0),
  status text not null check (status in ('Active','Culled')),
  tags text[] not null default '{}',
  feed_cost numeric not null default 0,
  feed_usage numeric not null default 0,
  chick_order_date timestamptz null,
  chick_delivery_date timestamptz null,
  cull_date timestamptz null,
  notes text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.feed_logs (
  id uuid primary key default gen_random_uuid(),
  chicken_id uuid not null references public.chickens(id) on delete cascade,
  date timestamptz not null,
  pounds numeric not null default 0,
  cost numeric not null default 0,
  notes text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_feed_logs_chicken_id on public.feed_logs (chicken_id);
create index if not exists idx_feed_logs_date on public.feed_logs (date);
create index if not exists idx_chickens_created_at on public.chickens (created_at desc);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create or replace trigger set_updated_at_chickens
before update on public.chickens
for each row execute procedure public.set_updated_at();

create or replace trigger set_updated_at_feed_logs
before update on public.feed_logs
for each row execute procedure public.set_updated_at();
