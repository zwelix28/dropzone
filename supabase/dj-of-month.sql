-- DJ of the month. One row powers the desktop Home card.
-- Run once in the Supabase SQL editor.

create table if not exists public.dj_of_month (
  id int primary key default 1 check (id = 1),
  profile_id uuid references public.profiles (id) on delete set null,
  mix_id uuid references public.mixes (id) on delete set null,
  photo_url text not null default '',
  bio text not null default '',
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id) on delete set null
);

alter table public.dj_of_month enable row level security;

drop policy if exists "dj_of_month_read" on public.dj_of_month;
create policy "dj_of_month_read"
  on public.dj_of_month
  for select
  using (true);

drop policy if exists "dj_of_month_admin_write" on public.dj_of_month;
create policy "dj_of_month_admin_write"
  on public.dj_of_month
  for all
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and coalesce(p.is_admin, false)
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and coalesce(p.is_admin, false)
    )
  );

grant select on public.dj_of_month to anon, authenticated;
grant insert, update on public.dj_of_month to authenticated;
