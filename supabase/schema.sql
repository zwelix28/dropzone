-- Dropzone Supabase schema — run in SQL Editor (Dashboard) or via CLI.
-- After: create Storage buckets "mix-audio" and "mix-covers" (public) if insert below fails (use Dashboard).

-- Extensions
create extension if not exists "pgcrypto";

-- Profiles (1:1 with auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  username text not null default 'DJ',
  handle text,
  bio text default '',
  avatar_url text default '',
  genre text default 'Tech House',
  location text default '',
  followers_count int not null default 0,
  following_count int not null default 0,
  verified boolean not null default false,
  is_admin boolean not null default false,
  is_banned boolean not null default false,
  plan text not null default 'free' check (plan in ('free', 'paid', 'pro')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.mixes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  title text not null,
  description text default '',
  genre text default 'Tech House',
  tags text[] not null default '{}',
  tracklist text[] not null default '{}',
  cover_url text default '',
  audio_url text not null default '',
  audio_storage_path text not null default '',
  audio_preview_path text not null default '',
  duration_secs int not null default 0,
  plays int not null default 0,
  downloads int not null default 0,
  shares int not null default 0,
  trending int not null default 999,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  type text not null,
  title text not null,
  message text default '',
  href text,
  episode_id uuid references public.mixes(id) on delete set null,
  read boolean not null default false,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_mixes_user_id on public.mixes(user_id);
create index if not exists idx_mixes_created_at on public.mixes(created_at desc);
create index if not exists idx_notifications_user on public.notifications(user_id, created_at desc);

-- Follows: follower_id follows following_id (counts on profiles maintained by trigger)
create table if not exists public.follows (
  follower_id uuid not null references auth.users (id) on delete cascade,
  following_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  constraint follows_no_self check (follower_id <> following_id)
);

create index if not exists idx_follows_following on public.follows (following_id);
create index if not exists idx_follows_follower on public.follows (follower_id);

-- Mix likes (favorites; signed-in users only via RLS)
create table if not exists public.mix_likes (
  user_id uuid not null references auth.users (id) on delete cascade,
  mix_id uuid not null references public.mixes (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, mix_id)
);

create index if not exists idx_mix_likes_user_created on public.mix_likes (user_id, created_at desc);
create index if not exists idx_mix_likes_mix on public.mix_likes (mix_id);

-- Admin audit trail (insert/select restricted by RLS to admins only)
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

-- New user → profile row
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  uname text;
  h text;
begin
  uname := coalesce(new.raw_user_meta_data->>'username', split_part(coalesce(new.email, ''), '@', 1));
  if uname = '' or uname is null then uname := 'DJ'; end if;
  h := coalesce(new.raw_user_meta_data->>'handle', '@' || lower(replace(uname, ' ', '')));
  insert into public.profiles (id, username, handle, genre)
  values (
    new.id,
    uname,
    h,
    coalesce(new.raw_user_meta_data->>'genre', 'Tech House')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- updated_at helper
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_updated on public.profiles;
create trigger profiles_updated before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists mixes_updated on public.mixes;
create trigger mixes_updated before update on public.mixes
  for each row execute function public.set_updated_at();

-- Non-admins cannot change is_admin, is_banned, or verified (admins set these in SQL Editor or app)
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
  -- Follow-sync trigger updates counts; do not strip those (would undo followers_count on the followed user’s row).
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

-- Keep followers_count / following_count in sync with public.follows
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

-- RPC: increment stats + optional notification (download/share only; plays still increment)
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

grant usage on schema public to anon, authenticated;
grant select on public.profiles to anon;
grant select on public.mixes to anon;
grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.mixes to authenticated;
grant select, update on public.notifications to authenticated;
grant select, insert, delete on public.follows to authenticated;
grant select, insert, delete on public.mix_likes to authenticated;
grant select, insert on public.admin_logs to authenticated;
grant execute on function public.record_mix_interaction(uuid, text) to anon, authenticated;
grant execute on function public.admin_remove_user_content(uuid) to authenticated;

-- RLS
alter table public.profiles enable row level security;
alter table public.mixes enable row level security;
alter table public.notifications enable row level security;
alter table public.admin_logs enable row level security;
alter table public.follows enable row level security;
alter table public.mix_likes enable row level security;

drop policy if exists "mix_likes_select_own" on public.mix_likes;
create policy "mix_likes_select_own" on public.mix_likes for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "mix_likes_insert_own" on public.mix_likes;
create policy "mix_likes_insert_own" on public.mix_likes for insert to authenticated
  with check (
    user_id = auth.uid()
    and not exists (select 1 from public.profiles p where p.id = auth.uid() and coalesce(p.is_banned, false))
  );

drop policy if exists "mix_likes_delete_own" on public.mix_likes;
create policy "mix_likes_delete_own" on public.mix_likes for delete to authenticated
  using (user_id = auth.uid());

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

drop policy if exists "profiles_select_all" on public.profiles;
create policy "profiles_select_all" on public.profiles for select using (true);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id);

drop policy if exists "profiles_update_admin" on public.profiles;
create policy "profiles_update_admin" on public.profiles for update to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true))
  with check (true);

drop policy if exists "mixes_select_all" on public.mixes;
create policy "mixes_select_all" on public.mixes for select using (true);

drop policy if exists "mixes_insert_own" on public.mixes;
create policy "mixes_insert_own" on public.mixes for insert with check (
  auth.uid() = user_id
  and not coalesce((select pr.is_banned from public.profiles pr where pr.id = auth.uid()), false)
);

drop policy if exists "mixes_update_own" on public.mixes;
create policy "mixes_update_own" on public.mixes for update using (auth.uid() = user_id);

drop policy if exists "mixes_delete_own" on public.mixes;
create policy "mixes_delete_own" on public.mixes for delete using (auth.uid() = user_id);

drop policy if exists "mixes_delete_admin" on public.mixes;
create policy "mixes_delete_admin" on public.mixes for delete to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true));

drop policy if exists "notifications_select_own" on public.notifications;
create policy "notifications_select_own" on public.notifications for select using (auth.uid() = user_id);

drop policy if exists "notifications_update_own" on public.notifications;
create policy "notifications_update_own" on public.notifications for update using (auth.uid() = user_id);

drop policy if exists "admin_logs_select" on public.admin_logs;
create policy "admin_logs_select" on public.admin_logs for select to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true));

drop policy if exists "admin_logs_insert" on public.admin_logs;
create policy "admin_logs_insert" on public.admin_logs for insert to authenticated
  with check (
    admin_id = auth.uid()
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
  );

-- Allow RPC to insert notifications (security definer bypasses RLS on notifications for insert)

-- Bulk-remove a user’s mixes and ban profile (auth.users row remains — delete auth user in Supabase Dashboard if needed)
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
  delete from public.mix_likes where user_id = p_user_id;
  delete from public.mix_likes where mix_id in (select id from public.mixes where user_id = p_user_id);
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

-- Storage (run in SQL; if permission denied, create buckets in Dashboard UI)
insert into storage.buckets (id, name, public)
values
  ('mix-audio', 'mix-audio', false),
  ('mix-previews', 'mix-previews', true),
  ('mix-covers', 'mix-covers', true),
  ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Full mixes: private bucket; playback via signed URLs
drop policy if exists "mix_audio_public_read" on storage.objects;
drop policy if exists "mix_audio_authenticated_select" on storage.objects;
create policy "mix_audio_authenticated_select" on storage.objects for select to authenticated
  using (bucket_id = 'mix-audio');

-- Anonymous signed reads: app limits guests to a 20s snippet in the player (not full DRM).
drop policy if exists "mix_audio_anon_select" on storage.objects;
create policy "mix_audio_anon_select" on storage.objects for select to anon
  using (bucket_id = 'mix-audio');

-- Short guest previews (optional per mix); public read
drop policy if exists "mix_previews_public_read" on storage.objects;
create policy "mix_previews_public_read" on storage.objects for select using (bucket_id = 'mix-previews');

drop policy if exists "mix_previews_auth_insert" on storage.objects;
create policy "mix_previews_auth_insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'mix-previews' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "mix_previews_auth_update" on storage.objects;
create policy "mix_previews_auth_update" on storage.objects for update to authenticated
  using (bucket_id = 'mix-previews' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "mix_previews_auth_delete" on storage.objects;
create policy "mix_previews_auth_delete" on storage.objects for delete to authenticated
  using (bucket_id = 'mix-previews' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "mix_covers_public_read" on storage.objects;
create policy "mix_covers_public_read" on storage.objects for select using (bucket_id = 'mix-covers');

drop policy if exists "mix_audio_auth_upload" on storage.objects;
create policy "mix_audio_auth_upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'mix-audio' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "mix_covers_auth_upload" on storage.objects;
create policy "mix_covers_auth_upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'mix-covers' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "mix_audio_auth_update" on storage.objects;
create policy "mix_audio_auth_update" on storage.objects for update to authenticated
  using (bucket_id = 'mix-audio' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "mix_covers_auth_update" on storage.objects;
create policy "mix_covers_auth_update" on storage.objects for update to authenticated
  using (bucket_id = 'mix-covers' and (storage.foldername(name))[1] = auth.uid()::text);

-- Profile photos: one object per user at {uid}/avatar (upsert replaces)
drop policy if exists "avatars_public_read" on storage.objects;
create policy "avatars_public_read" on storage.objects for select using (bucket_id = 'avatars');

drop policy if exists "avatars_auth_upload" on storage.objects;
create policy "avatars_auth_upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "avatars_auth_update" on storage.objects;
create policy "avatars_auth_update" on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "avatars_auth_delete" on storage.objects;
create policy "avatars_auth_delete" on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- Realtime: notifications (bell) + profiles (follower/following counts on screen)
do $$
begin
  alter publication supabase_realtime add table public.notifications;
exception
  when duplicate_object then
    null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.profiles;
exception
  when duplicate_object then
    null;
end $$;
