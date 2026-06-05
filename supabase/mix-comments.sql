-- Mix comments for For You / mix detail social features.
-- Run in Supabase SQL Editor after base schema.

create table if not exists public.mix_comments (
  id uuid primary key default gen_random_uuid(),
  mix_id uuid not null references public.mixes (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 500),
  created_at timestamptz not null default now()
);

create index if not exists idx_mix_comments_mix_created on public.mix_comments (mix_id, created_at desc);
create index if not exists idx_mix_comments_user on public.mix_comments (user_id);

alter table public.mix_comments enable row level security;

drop policy if exists "mix_comments_select" on public.mix_comments;
create policy "mix_comments_select"
  on public.mix_comments for select
  to authenticated
  using (true);

drop policy if exists "mix_comments_insert_own" on public.mix_comments;
create policy "mix_comments_insert_own"
  on public.mix_comments for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "mix_comments_delete_own" on public.mix_comments;
create policy "mix_comments_delete_own"
  on public.mix_comments for delete
  to authenticated
  using (auth.uid() = user_id);
