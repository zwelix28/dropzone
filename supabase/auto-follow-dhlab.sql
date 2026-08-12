-- Auto-follow the official @deephouselab account when a new user registers.
-- Run in Supabase SQL Editor (replaces public.handle_new_user).
--
-- Requires a profiles row whose handle normalizes to "deephouselab"
-- (e.g. @deephouselab). Optional VITE_DHLAB_USER_ID in the app for client fallback.

create or replace function public.resolve_dhlab_profile_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select p.id
  from public.profiles p
  where lower(regexp_replace(coalesce(p.handle, ''), '^@', '')) = 'deephouselab'
     or lower(trim(coalesce(p.username, ''))) in ('deephouselab', 'deep house lab')
  order by
    case when lower(regexp_replace(coalesce(p.handle, ''), '^@', '')) = 'deephouselab' then 0 else 1 end,
    p.created_at asc nulls last
  limit 1;
$$;

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

  -- New accounts automatically follow @deephouselab (skip if self or missing).
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

revoke all on function public.resolve_dhlab_profile_id() from public;
grant execute on function public.resolve_dhlab_profile_id() to authenticated, anon, service_role;

-- Optional: backfill existing users who do not yet follow @deephouselab
-- (uncomment and run once if you want current accounts included too):
--
-- insert into public.follows (follower_id, following_id)
-- select p.id, d.id
-- from public.profiles p
-- cross join lateral (select public.resolve_dhlab_profile_id() as id) d
-- where d.id is not null
--   and p.id is distinct from d.id
-- on conflict do nothing;
