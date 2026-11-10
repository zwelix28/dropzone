-- Member event submissions for "This week on the floor" with admin review + notify.
-- Run after supabase/floor-events.sql in the Supabase SQL editor.

alter table public.floor_events
  add column if not exists status text not null default 'approved',
  add column if not exists submitter_id uuid references public.profiles (id) on delete set null,
  add column if not exists is_promoting boolean not null default false,
  add column if not exists lineup text not null default '',
  add column if not exists review_note text not null default '',
  add column if not exists reviewed_at timestamptz,
  add column if not exists reviewed_by uuid references public.profiles (id) on delete set null,
  add column if not exists submitted_at timestamptz;

update public.floor_events
set status = 'approved'
where status is null or status not in ('pending', 'approved', 'rejected');

alter table public.floor_events drop constraint if exists floor_events_status_check;
alter table public.floor_events add constraint floor_events_status_check
  check (status in ('pending', 'approved', 'rejected'));

create index if not exists floor_events_status_idx
  on public.floor_events (status, starts_at);

-- Public / member reads: approved+published events, own submissions, or admin.
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

-- Members submit pending events only.
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

-- Admins keep full write (create published, review, edit, delete).
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

-- Alert admins when a member submits an event.
create or replace function public.notify_admins_floor_submission()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  admin_id uuid;
  uname text;
  uhandle text;
begin
  if coalesce(new.status, 'approved') <> 'pending' then
    return new;
  end if;

  select coalesce(nullif(trim(username), ''), 'Someone'), coalesce(nullif(trim(handle), ''), '@user')
  into uname, uhandle
  from public.profiles
  where id = new.submitter_id;

  for admin_id in
    select p.id from public.profiles p
    where coalesce(p.is_admin, false) = true and p.id is distinct from new.submitter_id
  loop
    insert into public.notifications (user_id, type, title, message, href, meta)
    values (
      admin_id,
      'floor_event_submitted',
      'Event awaiting review',
      coalesce(uname, 'Someone') || ' (' || coalesce(uhandle, '@user') || ') submitted "'
        || left(coalesce(new.title, 'Untitled event'), 80) || '" for On the floor.',
      '/admin?tab=floor',
      jsonb_build_object(
        'event_id', new.id::text,
        'submitter_id', coalesce(new.submitter_id::text, ''),
        'pending_review', true
      )
    );
  end loop;

  return new;
end;
$$;

drop trigger if exists floor_events_notify_admins_submission on public.floor_events;
create trigger floor_events_notify_admins_submission
  after insert on public.floor_events
  for each row execute function public.notify_admins_floor_submission();

-- Tell the submitter when review finishes (especially approved).
create or replace function public.notify_user_floor_review()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(old.status, 'approved') = coalesce(new.status, 'approved') then
    return new;
  end if;

  if new.submitter_id is null then
    return new;
  end if;

  if new.status = 'approved' then
    insert into public.notifications (user_id, type, title, message, href, meta)
    values (
      new.submitter_id,
      'floor_event_approved',
      'Event approved',
      '"' || left(coalesce(new.title, 'Untitled event'), 80)
        || '" is now live on This week on the floor.',
      '/home',
      jsonb_build_object('event_id', new.id::text, 'status', 'approved')
    );
  elsif new.status = 'rejected' then
    insert into public.notifications (user_id, type, title, message, href, meta)
    values (
      new.submitter_id,
      'floor_event_rejected',
      'Event not approved',
      '"' || left(coalesce(new.title, 'Untitled event'), 80) || '" was not published.'
        || case when coalesce(new.review_note, '') <> '' then ' Reason: ' || left(new.review_note, 200) else '' end,
      '/on-the-floor',
      jsonb_build_object('event_id', new.id::text, 'status', 'rejected')
    );
  end if;

  return new;
end;
$$;

drop trigger if exists floor_events_notify_user_review on public.floor_events;
create trigger floor_events_notify_user_review
  after update of status on public.floor_events
  for each row execute function public.notify_user_floor_review();
