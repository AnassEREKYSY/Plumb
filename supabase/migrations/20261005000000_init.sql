-- Plumb — initial schema
-- Every table is private to its owner through Row Level Security.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------- profiles
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  locale text not null default 'en' check (locale in ('en', 'fr')),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- accounts
create table public.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  kind text not null default 'demo' check (kind in ('demo', 'live', 'prop')),
  currency text not null default 'EUR' check (char_length(currency) = 3),
  starting_balance numeric(14, 2) not null default 10000 check (starting_balance >= 0),
  risk_per_trade_pct numeric(5, 2) not null default 1 check (risk_per_trade_pct > 0 and risk_per_trade_pct <= 100),
  timezone text not null default 'Europe/Paris',
  created_at timestamptz not null default now()
);
create index accounts_user_idx on public.accounts (user_id);

-- ---------------------------------------------------------------- setups (playbook)
create table public.setups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  description text,
  checklist text[] not null default '{}',
  color text,
  created_at timestamptz not null default now()
);
create index setups_user_idx on public.setups (user_id);

-- ---------------------------------------------------------------- trades (plan + reality)
create table public.trades (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  account_id uuid not null references public.accounts (id) on delete cascade,
  setup_id uuid references public.setups (id) on delete set null,
  status text not null default 'planned' check (status in ('planned', 'open', 'closed', 'cancelled')),
  symbol text not null check (char_length(symbol) between 1 and 24),
  market text not null default 'forex' check (market in ('forex', 'stocks', 'crypto', 'futures', 'indices', 'commodities')),
  direction text not null check (direction in ('long', 'short')),
  point_value numeric(18, 6) not null default 1 check (point_value > 0),

  -- the plan
  planned_entry numeric(18, 6),
  initial_stop numeric(18, 6),          -- never overwritten: R is measured against it
  target numeric(18, 6),
  planned_size numeric(18, 6),
  reason text,
  checklist_done text[] not null default '{}',

  -- what really happened (average prices when there were several fills)
  entry_price numeric(18, 6),
  exit_price numeric(18, 6),
  final_stop numeric(18, 6),
  size numeric(18, 6),
  fees numeric(14, 2) not null default 0,
  pnl_override numeric(14, 2),          -- broker's net result when entered by hand
  opened_at timestamptz not null default now(),
  closed_at timestamptz,

  -- psychology
  emotion_before text,
  emotion_after text,
  notes text,
  lesson text,
  tags text[] not null default '{}',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index trades_user_opened_idx on public.trades (user_id, opened_at);
create index trades_account_idx on public.trades (account_id);

-- ---------------------------------------------------------------- personal rules
create table public.rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  account_id uuid references public.accounts (id) on delete cascade, -- null = all accounts
  kind text not null check (kind in (
    'max_risk_pct', 'require_stop', 'min_rr', 'max_trades_per_day',
    'max_losses_per_day', 'no_stop_widening', 'trading_hours'
  )),
  params jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index rules_user_idx on public.rules (user_id);

-- ---------------------------------------------------------------- weekly reviews
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  week_start date not null,
  went_well text,
  to_improve text,
  focus_next text,
  created_at timestamptz not null default now(),
  unique (user_id, week_start)
);

-- ---------------------------------------------------------------- updated_at
create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create trigger trades_touch before update on public.trades
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------- RLS
alter table public.profiles enable row level security;
alter table public.accounts enable row level security;
alter table public.setups enable row level security;
alter table public.trades enable row level security;
alter table public.rules enable row level security;
alter table public.reviews enable row level security;

create policy "own profile" on public.profiles
  for all using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

create policy "own accounts" on public.accounts
  for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create policy "own setups" on public.setups
  for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create policy "own rules" on public.rules
  for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create policy "own reviews" on public.reviews
  for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- A trade can only point to the user's own account and setup.
create policy "own trades" on public.trades
  for all using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and exists (select 1 from public.accounts a where a.id = account_id and a.user_id = (select auth.uid()))
    and (setup_id is null or exists (select 1 from public.setups s where s.id = setup_id and s.user_id = (select auth.uid())))
  );

-- ---------------------------------------------------------------- new user bootstrap
-- Creates a profile, a demo account and the default rule templates.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  acc uuid;
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)));

  insert into public.accounts (user_id, name, kind, currency, starting_balance, risk_per_trade_pct)
  values (new.id, 'Demo account', 'demo', 'EUR', 10000, 1)
  returning id into acc;

  insert into public.rules (user_id, kind, params, active) values
    (new.id, 'max_risk_pct', '{"value": 1}', true),
    (new.id, 'require_stop', '{}', true),
    (new.id, 'min_rr', '{"value": 1.5}', true),
    (new.id, 'max_trades_per_day', '{"value": 3}', true),
    (new.id, 'max_losses_per_day', '{"value": 2}', true),
    (new.id, 'no_stop_widening', '{}', true),
    (new.id, 'trading_hours', '{"start": "08:00", "end": "21:00"}', false);

  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
