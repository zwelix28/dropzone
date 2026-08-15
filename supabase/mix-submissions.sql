-- Member mix submissions with admin review.
-- Any approved member can submit a mix; it stays hidden until an admin approves it.
-- Run in Supabase SQL Editor after schema.sql / admin-only-uploads.sql / user-approval.sql.

alter table public.mixes add column if not exists status text not null default 'approved';
alter table public.mixes add column if not exists review_note text not null default '';
alter table public.mixes add column if not exists reviewed_at timestamptz;
alter table public.mixes add column if not exists reviewed_by uuid references auth.users on delete set null;
alter table public.mixes add column if not exists submitted_at timestamptz;

-- Everything already on the site stays live.
update public.mixes
set status = 'approved'
where status is null or status not in ('pending', 'approved', 'rejected');

alter table public.mixes drop constraint if exists mixes_status_check;
alter table public.mixes add constraint mixes_status_check
  check (status in ('pending', 'approved', 'rejected'));

create index if not exists idx_mixes_status on public.mixes (status, created_at desc);

-- Reads: pending/rejected mixes are visible only to their owner and to admins.
drop policy if exists "mixes_select_all" on public.mixes;
drop policy if exists "mixes_select_approved" on public.mixes;
create policy "mixes_select_approved" on public.mixes for select
  using (
    coalesce(status, 'approved') = 'approved'
    or auth.uid() = user_id
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and coalesce(p.is_admin, false) = true
    )
  );

-- Admins keep publishing directly; members may only create pending submissions.
drop policy if exists "mixes_insert_own" on public.mixes;
drop policy if exists "mixes_insert_admin" on public.mixes;
create policy "mixes_insert_admin" on public.mixes for insert to authenticated
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and coalesce(p.is_admin, false) = true
        and coalesce(p.is_banned, false) = false
    )
  );

drop policy if exists "mixes_insert_submission" on public.mixes;
create policy "mixes_insert_submission" on public.mixes for insert to authenticated
  with check (
    auth.uid() = user_id
    and status = 'pending'
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and coalesce(p.is_banned, false) = false
        and coalesce(p.is_approved, true) = true
    )
  );

drop policy if exists "mixes_update_admin" on public.mixes;
create policy "mixes_update_admin" on public.mixes for update to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and coalesce(p.is_admin, false) = true
    )
  )
  with check (true);

-- Owners can still edit their own mix, but never their own review verdict.
create or replace function public.mixes_protect_review_columns()
returns trigger
language plpgsql
as $$
declare
  adm boolean;
begin
  if auth.uid() is null then
    return new;
  end if;
  select coalesce(is_admin, false) into adm from public.profiles where id = auth.uid();
  if not coalesce(adm, false) then
    -- Cover replacements after initial submission are administrator-only.
    new.cover_url := old.cover_url;
    new.status := old.status;
    new.review_note := old.review_note;
    new.reviewed_at := old.reviewed_at;
    new.reviewed_by := old.reviewed_by;
    new.submitted_at := old.submitted_at;
  end if;
  return new;
end;
$$;

drop trigger if exists mixes_protect_review on public.mixes;
create trigger mixes_protect_review before update on public.mixes
  for each row execute function public.mixes_protect_review_columns();

-- Followers hear about a mix when it goes live, not when it is submitted.
create or replace function public.notify_followers_new_mix()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  uname text;
  follower uuid;
begin
  if coalesce(new.status, 'approved') <> 'approved' then
    return new;
  end if;
  if tg_op = 'UPDATE' and coalesce(old.status, 'approved') = 'approved' then
    return new;
  end if;

  select coalesce(username, 'Someone') into uname from public.profiles where id = new.user_id;

  for follower in
    select f.follower_id
    from public.follows f
    where f.following_id = new.user_id
  loop
    if exists (
      select 1 from public.profiles p
      where p.id = follower and coalesce(p.is_banned, false)
    ) then
      continue;
    end if;

    insert into public.notifications (user_id, type, title, message, href, episode_id, meta)
    values (
      follower,
      'new_mix',
      'New mix from ' || uname,
      uname || ' uploaded "' || left(coalesce(new.title, 'Untitled Mix'), 80) || '".',
      '/mix/' || new.id::text,
      new.id,
      jsonb_build_object(
        'uploader_id', new.user_id::text,
        'uploader_username', uname
      )
    );
  end loop;

  return new;
end;
$$;

drop trigger if exists mixes_notify_followers on public.mixes;
create trigger mixes_notify_followers
  after insert or update of status on public.mixes
  for each row execute function public.notify_followers_new_mix();

-- Alert admins when a member submits a mix for review.
create or replace function public.notify_admins_mix_submission()
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
  where id = new.user_id;

  for admin_id in
    select p.id from public.profiles p
    where coalesce(p.is_admin, false) = true and p.id is distinct from new.user_id
  loop
    insert into public.notifications (user_id, type, title, message, href, episode_id, meta)
    values (
      admin_id,
      'mix_submitted',
      'Mix awaiting review',
      coalesce(uname, 'Someone') || ' (' || coalesce(uhandle, '@user') || ') submitted "'
        || left(coalesce(new.title, 'Untitled Mix'), 80) || '" for review.',
      '/admin',
      new.id,
      jsonb_build_object(
        'submitter_id', new.user_id::text,
        'username', uname,
        'handle', uhandle,
        'pending_review', true
      )
    );
  end loop;

  return new;
end;
$$;

drop trigger if exists mixes_notify_admins_submission on public.mixes;
create trigger mixes_notify_admins_submission
  after insert on public.mixes
  for each row execute function public.notify_admins_mix_submission();

-- Tell the member how the review went.
create or replace function public.notify_user_mix_review()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(old.status, 'approved') = coalesce(new.status, 'approved') then
    return new;
  end if;

  if new.status = 'approved' then
    insert into public.notifications (user_id, type, title, message, href, episode_id, meta)
    values (
      new.user_id,
      'mix_approved',
      'Mix approved',
      '"' || left(coalesce(new.title, 'Untitled Mix'), 80) || '" is now live on Music Vault.',
      '/mix/' || new.id::text,
      new.id,
      jsonb_build_object('status', 'approved')
    );
  elsif new.status = 'rejected' then
    insert into public.notifications (user_id, type, title, message, href, episode_id, meta)
    values (
      new.user_id,
      'mix_rejected',
      'Mix not approved',
      '"' || left(coalesce(new.title, 'Untitled Mix'), 80) || '" was not added to the site.'
        || case when coalesce(new.review_note, '') <> '' then ' Reason: ' || left(new.review_note, 200) else '' end,
      '/submit-mix',
      new.id,
      jsonb_build_object('status', 'rejected', 'review_note', coalesce(new.review_note, ''))
    );
  end if;

  return new;
end;
$$;

drop trigger if exists mixes_notify_user_review on public.mixes;
create trigger mixes_notify_user_review
  after update of status on public.mixes
  for each row execute function public.notify_user_mix_review();
