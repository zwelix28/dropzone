-- Open registration: new accounts are approved immediately and can use the app.
-- Run in Supabase SQL Editor (after user-approval.sql / auto-follow-dhlab.sql).
--
-- Admins can still revoke access via is_approved / is_banned in the Admin panel.

alter table public.profiles
  alter column is_approved set default true;

comment on column public.profiles.is_approved is
  'When false, user may authenticate but cannot use the app (admin revoke). New signups default to true.';

-- Unlock anyone still waiting behind the old approval gate.
update public.profiles
set is_approved = true
where is_approved is distinct from true
  and coalesce(is_banned, false) = false;

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
    true
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

-- Admin alerts: welcome notice, not “awaiting approval”.
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
      'New member joined',
      uname || ' (' || uhandle || ') joined Deep House Lab.',
      '/user/' || new.id::text,
      jsonb_build_object(
        'new_user_id', new.id::text,
        'username', uname,
        'handle', uhandle,
        'pending_approval', false
      )
    );
  end loop;

  return new;
end;
$$;
