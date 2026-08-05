-- Notify administrators when a new user signs up (profile row created).
-- Run in Supabase SQL Editor on existing projects.

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
      'New user signed up',
      uname || ' (' || uhandle || ') joined Music Vault.',
      '/user/' || new.id::text,
      jsonb_build_object(
        'new_user_id', new.id::text,
        'username', uname,
        'handle', uhandle
      )
    );
  end loop;

  return new;
end;
$$;

drop trigger if exists profiles_notify_admins_new_user on public.profiles;
create trigger profiles_notify_admins_new_user
  after insert on public.profiles
  for each row execute function public.notify_admins_new_user();
