-- Admin approval gate for new accounts.
-- Run in Supabase SQL Editor after base schema / user-plans.sql.
--
-- New signups start with is_approved = false and cannot use the app until an admin approves them.
-- Existing profiles are backfilled to approved so current users are not locked out.

alter table public.profiles
  add column if not exists is_approved boolean not null default false;

-- Existing accounts keep access (run once when enabling this feature).
update public.profiles set is_approved = true where is_approved is distinct from true;

-- Ensure admins stay approved going forward.
update public.profiles set is_approved = true where coalesce(is_admin, false) = true;

comment on column public.profiles.is_approved is
  'When false, user may authenticate but cannot use the app until an admin approves.';

-- New users insert as unapproved (default false). Keep auto-follow behaviour.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  uname text;
  h text;
  dhlab_id uuid;
begin
  uname := coalesce(new.raw_user_meta_data->>'username', split_part(coalesce(new.email, ''), '@', 1));
  if uname = '' or uname is null then uname := 'DJ'; end if;
  h := coalesce(new.raw_user_meta_data->>'handle', '@' || lower(replace(uname, ' ', '')));
  insert into public.profiles (id, username, handle, genre, is_approved)
  values (
    new.id,
    uname,
    h,
    coalesce(new.raw_user_meta_data->>'genre', 'Tech House'),
    false
  )
  on conflict (id) do nothing;

  dhlab_id := public.resolve_dhlab_profile_id();
  if dhlab_id is not null and dhlab_id is distinct from new.id then
    insert into public.follows (follower_id, following_id)
    values (new.id, dhlab_id)
    on conflict do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Non-admins cannot self-approve.
create or replace function public.profiles_protect_privileged_columns()
returns trigger
language plpgsql
as $$
declare
  adm boolean;
begin
  if auth.uid() is null then
    return new;
  end if;
  if coalesce(current_setting('app.skip_profile_count_protect', true), '') = 'on' then
    return new;
  end if;
  select coalesce(is_admin, false) into adm from public.profiles where id = auth.uid();
  if not adm then
    new.is_admin := old.is_admin;
    new.is_banned := old.is_banned;
    new.verified := old.verified;
    new.is_approved := old.is_approved;
    new.plan := old.plan;
    new.followers_count := old.followers_count;
    new.following_count := old.following_count;
  end if;
  -- Admins are always treated as approved.
  if coalesce(new.is_admin, false) then
    new.is_approved := true;
  end if;
  return new;
end;
$$;

-- Point admin signup alerts at the admin panel for approval.
create or replace function public.notify_admins_new_user()
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
  uname := coalesce(nullif(trim(new.username), ''), 'Someone');
  uhandle := coalesce(nullif(trim(new.handle), ''), '@user');

  for admin_id in
    select p.id
    from public.profiles p
    where coalesce(p.is_admin, false) = true
      and p.id is distinct from new.id
  loop
    insert into public.notifications (user_id, type, title, message, href, meta)
    values (
      admin_id,
      'new_user',
      'Approval needed',
      uname || ' (' || uhandle || ') signed up and is waiting for approval.',
      '/admin',
      jsonb_build_object(
        'new_user_id', new.id::text,
        'username', uname,
        'handle', uhandle,
        'pending_approval', true
      )
    );
  end loop;

  return new;
end;
$$;

-- Notify the member when an admin approves them.
create or replace function public.notify_user_on_approval()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(old.is_approved, false) = false and coalesce(new.is_approved, false) = true then
    insert into public.notifications (user_id, type, title, message, href, meta)
    values (
      new.id,
      'account_approved',
      'Account approved',
      'Welcome to Music Vault — your account is ready. Start listening.',
      '/mixes',
      jsonb_build_object('approved', true)
    );
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_notify_user_on_approval on public.profiles;
create trigger profiles_notify_user_on_approval
  after update of is_approved on public.profiles
  for each row execute function public.notify_user_on_approval();
