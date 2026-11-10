-- Curated deep-house events for desktop Home ("This week on the floor").
-- Run once in the Supabase SQL editor, then run floor-events-submissions.sql
-- for member submissions + review notifications.

create table if not exists public.floor_events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  venue text not null default '',
  city text not null default '',
  starts_at timestamptz not null,
  ends_at timestamptz,
  flyer_url text not null default '',
  ticket_url text not null default '',
  details_url text not null default '',
  lineup text not null default '',
  is_featured boolean not null default false,
  is_published boolean not null default true,
  is_promoting boolean not null default false,
  status text not null default 'approved',
  submitter_id uuid references public.profiles (id) on delete set null,
  review_note text not null default '',
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles (id) on delete set null,
  submitted_at timestamptz,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id) on delete set null,
  constraint floor_events_status_check check (status in ('pending', 'approved', 'rejected'))
);

create index if not exists floor_events_home_idx
  on public.floor_events (is_published, status, starts_at);

create index if not exists floor_events_status_idx
  on public.floor_events (status, starts_at);

alter table public.floor_events enable row level security;

drop policy if exists "floor_events_read" on public.floor_events;
create policy "floor_events_read"
  on public.floor_events
  for select
  using (
    (status = 'approved' and is_published = true)
    or auth.uid() = submitter_id
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and coalesce(p.is_admin, false)
    )
  );

drop policy if exists "floor_events_member_insert" on public.floor_events;
create policy "floor_events_member_insert"
  on public.floor_events
  for insert
  to authenticated
  with check (
    auth.uid() = submitter_id
    and status = 'pending'
    and is_published = false
    and is_featured = false
    and public.profile_can_use_app(auth.uid())
  );

drop policy if exists "floor_events_admin_write" on public.floor_events;
create policy "floor_events_admin_write"
  on public.floor_events
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

grant select on public.floor_events to anon, authenticated;
grant insert, update, delete on public.floor_events to authenticated;
