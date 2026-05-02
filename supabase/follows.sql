-- User follows — run in SQL Editor on an existing project (after base schema + profiles).
-- Ensures profiles.plan exists (tiers: free / paid / pro) before the protect trigger below.

alter table public.profiles add column if not exists plan text not null default 'free';
update public.profiles set plan = 'free' where plan is null or plan not in ('free', 'paid', 'pro');
alter table public.profiles drop constraint if exists profiles_plan_check;
alter table public.profiles add constraint profiles_plan_check check (plan in ('free', 'paid', 'pro'));

create table if not exists public.follows (
  follower_id uuid not null references auth.users (id) on delete cascade,
  following_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  constraint follows_no_self check (follower_id <> following_id)
);

create index if not exists idx_follows_following on public.follows (following_id);
create index if not exists idx_follows_follower on public.follows (follower_id);

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
    new.plan := old.plan;
    new.followers_count := old.followers_count;
    new.following_count := old.following_count;
  end if;
  return new;
end;
$$;

create or replace function public.follows_sync_profile_counts()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  uname text;
begin
  if tg_op = 'INSERT' then
    perform set_config('app.skip_profile_count_protect', 'on', true);
    update public.profiles set followers_count = followers_count + 1 where id = new.following_id;
    update public.profiles set following_count = following_count + 1 where id = new.follower_id;
    perform set_config('app.skip_profile_count_protect', '', true);
    select coalesce(username, 'Someone') into uname from public.profiles where id = new.follower_id;
    insert into public.notifications (user_id, type, title, message, href, meta)
    values (
      new.following_id,
      'follow',
      'New follower',
      coalesce(uname, 'Someone') || ' started following you.',
      '/user/' || new.follower_id::text,
      jsonb_build_object('follower_id', new.follower_id::text)
    );
    return new;
  elsif tg_op = 'DELETE' then
    perform set_config('app.skip_profile_count_protect', 'on', true);
    update public.profiles set followers_count = greatest(0, followers_count - 1) where id = old.following_id;
    update public.profiles set following_count = greatest(0, following_count - 1) where id = old.follower_id;
    perform set_config('app.skip_profile_count_protect', '', true);
    return old;
  end if;
  return null;
end;
$$;

drop trigger if exists follows_after_insert on public.follows;
create trigger follows_after_insert
  after insert on public.follows
  for each row execute function public.follows_sync_profile_counts();

drop trigger if exists follows_after_delete on public.follows;
create trigger follows_after_delete
  after delete on public.follows
  for each row execute function public.follows_sync_profile_counts();

grant select, insert, delete on public.follows to authenticated;

alter table public.follows enable row level security;

drop policy if exists "follows_select_involved" on public.follows;
create policy "follows_select_involved" on public.follows for select to authenticated
  using (follower_id = auth.uid() or following_id = auth.uid());

drop policy if exists "follows_insert_own" on public.follows;
create policy "follows_insert_own" on public.follows for insert to authenticated
  with check (
    follower_id = auth.uid()
    and following_id <> auth.uid()
    and not exists (select 1 from public.profiles p where p.id = auth.uid() and coalesce(p.is_banned, false))
    and not exists (select 1 from public.profiles p where p.id = following_id and coalesce(p.is_banned, false))
  );

drop policy if exists "follows_delete_own" on public.follows;
create policy "follows_delete_own" on public.follows for delete to authenticated
  using (follower_id = auth.uid());

-- Keep admin bulk-remove in sync (if function already exists)
create or replace function public.admin_remove_user_content(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_user_id = auth.uid() then
    raise exception 'cannot remove your own account this way';
  end if;
  if not exists (select 1 from public.profiles where id = auth.uid() and coalesce(is_admin, false)) then
    raise exception 'not allowed';
  end if;
  delete from public.follows where follower_id = p_user_id or following_id = p_user_id;
  delete from public.mixes where user_id = p_user_id;
  update public.profiles
  set
    is_banned = true,
    username = 'Removed user',
    handle = '@removed',
    bio = ''
  where id = p_user_id;
end;
$$;
