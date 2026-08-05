-- Pro Marketplace: Paid mix sales, subscriptions, withdrawals.
-- Run in Supabase SQL Editor after base schema.

-- ─── 1. Extend existing tables ───────────────────────────────────────────────

alter table public.mixes
  add column if not exists is_for_sale boolean not null default false,
  add column if not exists price_zar numeric(10,2) default null,
  add column if not exists sales_count int not null default 0;

alter table public.profiles
  add column if not exists paystack_customer_code text default null,
  add column if not exists paystack_subscription_code text default null;

-- ─── 2. mix_purchases ────────────────────────────────────────────────────────

create table if not exists public.mix_purchases (
  id uuid primary key default gen_random_uuid(),
  buyer_user_id uuid not null references auth.users (id) on delete cascade,
  seller_user_id uuid not null references auth.users (id) on delete cascade,
  mix_id uuid not null references public.mixes (id) on delete cascade,
  amount_zar numeric(10,2) not null,
  platform_fee_zar numeric(10,2) not null default 0,
  seller_net_zar numeric(10,2) not null,
  paystack_reference text unique,
  status text not null default 'pending' check (status in ('pending', 'paid', 'refunded')),
  period_month date not null default date_trunc('month', now())::date,
  created_at timestamptz not null default now(),
  cleared_at timestamptz default null,
  unique (buyer_user_id, mix_id)
);

create index if not exists idx_mix_purchases_seller on public.mix_purchases (seller_user_id, created_at desc);
create index if not exists idx_mix_purchases_buyer on public.mix_purchases (buyer_user_id, created_at desc);
create index if not exists idx_mix_purchases_mix on public.mix_purchases (mix_id);
create index if not exists idx_mix_purchases_period on public.mix_purchases (seller_user_id, period_month);

alter table public.mix_purchases enable row level security;

-- Buyers see their own purchases; sellers see purchases of their mixes; admins see all
drop policy if exists "mix_purchases_buyer_select" on public.mix_purchases;
create policy "mix_purchases_buyer_select" on public.mix_purchases for select to authenticated
  using (auth.uid() = buyer_user_id);

drop policy if exists "mix_purchases_seller_select" on public.mix_purchases;
create policy "mix_purchases_seller_select" on public.mix_purchases for select to authenticated
  using (auth.uid() = seller_user_id);

drop policy if exists "mix_purchases_admin_select" on public.mix_purchases;
create policy "mix_purchases_admin_select" on public.mix_purchases for select to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and coalesce(p.is_admin, false)));

-- ─── 3. seller_bank_accounts ─────────────────────────────────────────────────

create table if not exists public.seller_bank_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  bank_name text not null,
  account_number_last4 text not null,
  account_holder_name text not null,
  paystack_recipient_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id)
);

alter table public.seller_bank_accounts enable row level security;

drop policy if exists "seller_bank_accounts_own" on public.seller_bank_accounts;
create policy "seller_bank_accounts_own" on public.seller_bank_accounts
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "seller_bank_accounts_admin" on public.seller_bank_accounts;
create policy "seller_bank_accounts_admin" on public.seller_bank_accounts for select to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and coalesce(p.is_admin, false)));

-- ─── 4. withdrawal_requests ──────────────────────────────────────────────────

create table if not exists public.withdrawal_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  amount_zar numeric(10,2) not null,
  status text not null default 'pending' check (status in ('pending', 'paid', 'rejected')),
  period_start date not null,
  period_end date not null,
  paystack_transfer_code text,
  admin_note text,
  requested_at timestamptz not null default now(),
  resolved_at timestamptz default null
);

create index if not exists idx_withdrawal_requests_user on public.withdrawal_requests (user_id, requested_at desc);

alter table public.withdrawal_requests enable row level security;

drop policy if exists "withdrawal_requests_own" on public.withdrawal_requests;
create policy "withdrawal_requests_own" on public.withdrawal_requests for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "withdrawal_requests_own_insert" on public.withdrawal_requests;
create policy "withdrawal_requests_own_insert" on public.withdrawal_requests for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "withdrawal_requests_admin" on public.withdrawal_requests;
create policy "withdrawal_requests_admin" on public.withdrawal_requests for all to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and coalesce(p.is_admin, false)));

-- ─── 5. Grant permissions ─────────────────────────────────────────────────────

grant select, insert, update on public.mix_purchases to authenticated;
grant select, insert, update, delete on public.seller_bank_accounts to authenticated;
grant select, insert on public.withdrawal_requests to authenticated;
