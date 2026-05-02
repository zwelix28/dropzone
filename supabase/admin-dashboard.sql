-- Admin dashboard support — run in SQL Editor on an existing project (after base schema).
-- Then promote yourself once:
--   update public.profiles set is_admin = true where id = 'YOUR-USER-UUID';

alter table public.profiles add column if not exists is_admin boolean not null default false;
alter table public.profiles add column if not exists is_banned boolean not null default false;
alter table public.profiles add column if not exists plan text not null default 'free';
update public.profiles set plan = 'free' where plan is null or plan not in ('free', 'paid', 'pro');
alter table public.profiles drop constraint if exists profiles_plan_check;
alter table public.profiles add constraint profiles_plan_check check (plan in ('free', 'paid', 'pro'));

create table if not exists public.admin_logs (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references auth.users (id) on delete cascade,
  action text not null,
  target_kind text,
  target_id text,
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_admin_logs_created_at on public.admin_logs(created_at desc);

alter table public.admin_logs enable row level security;

drop policy if exists "admin_logs_select" on public.admin_logs;
create policy "admin_logs_select" on public.admin_logs for select to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true));

drop policy if exists "admin_logs_insert" on public.admin_logs;
create policy "admin_logs_insert" on public.admin_logs for insert to authenticated
  with check (
    admin_id = auth.uid()
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
  );

grant select, insert on public.admin_logs to authenticated;

drop trigger if exists profiles_protect_privileged on public.profiles;
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

create trigger profiles_protect_privileged
  before update on public.profiles
  for each row execute function public.profiles_protect_privileged_columns();

drop policy if exists "profiles_update_admin" on public.profiles;
create policy "profiles_update_admin" on public.profiles for update to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true))
  with check (true);

drop policy if exists "mixes_delete_admin" on public.mixes;
create policy "mixes_delete_admin" on public.mixes for delete to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true));

drop policy if exists "mixes_insert_own" on public.mixes;
create policy "mixes_insert_own" on public.mixes for insert with check (
  auth.uid() = user_id
  and not coalesce((select pr.is_banned from public.profiles pr where pr.id = auth.uid()), false)
);

create or replace function public.record_mix_interaction(p_mix_id uuid, p_kind text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  m public.mixes%rowtype;
  actor uuid;
begin
  actor := auth.uid();
  if exists (select 1 from public.profiles where id = actor and coalesce(is_banned, false)) then
    return;
  end if;
  select * into m from public.mixes where id = p_mix_id;
  if not found then return; end if;

  if p_kind = 'play' then
    update public.mixes set plays = plays + 1 where id = p_mix_id;
  elsif p_kind = 'download' then
    update public.mixes set downloads = downloads + 1 where id = p_mix_id;
  elsif p_kind = 'share' then
    update public.mixes set shares = shares + 1 where id = p_mix_id;
  else
    return;
  end if;

  if p_kind in ('download', 'share') and m.user_id is distinct from actor then
    insert into public.notifications (user_id, type, title, message, href, episode_id)
    values (
      m.user_id,
      p_kind,
      case p_kind when 'download' then 'New download' else 'New share' end,
      case p_kind
        when 'download' then 'Someone downloaded "' || left(m.title, 80) || '".'
        else 'Someone shared "' || left(m.title, 80) || '".'
      end,
      '/mix/' || p_mix_id::text,
      p_mix_id
    );
  end if;
end;
$$;

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

grant execute on function public.admin_remove_user_content(uuid) to authenticated;
