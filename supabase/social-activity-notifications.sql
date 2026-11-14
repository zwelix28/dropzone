-- Social activity notifications for uploaders / profiles:
--   follow  → notify the person who was followed
--   like    → notify the mix uploader
--   mix_presave → notify the mix uploader when someone pre-saves
--
-- In-app rows land in public.notifications (Realtime + bell).
-- Phone push is handled by notify-delivery for these types (redeploy that function).
--
-- Run after mix-presaves.sql (and base schema with follows / mix_likes).

-- ---------------------------------------------------------------------------
-- Follows: keep counts + notify (only if recipient can use the app)
-- ---------------------------------------------------------------------------
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

    if public.profile_can_use_app(new.following_id) then
      select coalesce(nullif(trim(username), ''), 'Someone') into uname
      from public.profiles
      where id = new.follower_id;

      insert into public.notifications (user_id, type, title, message, href, meta)
      values (
        new.following_id,
        'follow',
        'New follower',
        coalesce(uname, 'Someone') || ' started following you.',
        '/user/' || new.follower_id::text,
        jsonb_build_object(
          'follower_id', new.follower_id::text,
          'actor_username', coalesce(uname, 'Someone')
        )
      );
    end if;
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

-- ---------------------------------------------------------------------------
-- Likes: bump count + notify mix uploader (not self-likes)
-- ---------------------------------------------------------------------------
create or replace function public.mix_likes_sync_counts()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  owner_id uuid;
  mix_title text;
  uname text;
begin
  if tg_op = 'INSERT' then
    update public.mixes set likes_count = likes_count + 1 where id = new.mix_id;

    select m.user_id, left(coalesce(m.title, 'Untitled Mix'), 80)
      into owner_id, mix_title
    from public.mixes m
    where m.id = new.mix_id;

    if owner_id is not null
       and owner_id is distinct from new.user_id
       and public.profile_can_use_app(owner_id)
    then
      select coalesce(nullif(trim(username), ''), 'Someone') into uname
      from public.profiles
      where id = new.user_id;

      insert into public.notifications (user_id, type, title, message, href, episode_id, meta)
      values (
        owner_id,
        'like',
        'New like',
        coalesce(uname, 'Someone') || ' liked "' || mix_title || '".',
        '/mix/' || new.mix_id::text,
        new.mix_id,
        jsonb_build_object(
          'actor_id', new.user_id::text,
          'actor_username', coalesce(uname, 'Someone'),
          'mix_id', new.mix_id::text
        )
      );
    end if;
    return new;
  elsif tg_op = 'DELETE' then
    update public.mixes set likes_count = greatest(0, likes_count - 1) where id = old.mix_id;
    return old;
  end if;
  return null;
end;
$$;

drop trigger if exists mix_likes_after_insert on public.mix_likes;
create trigger mix_likes_after_insert
  after insert on public.mix_likes
  for each row execute function public.mix_likes_sync_counts();

drop trigger if exists mix_likes_after_delete on public.mix_likes;
create trigger mix_likes_after_delete
  after delete on public.mix_likes
  for each row execute function public.mix_likes_sync_counts();

-- ---------------------------------------------------------------------------
-- Pre-saves: notify mix uploader when someone bookmarks a pre-save mix
-- ---------------------------------------------------------------------------
create or replace function public.mix_presaves_notify_uploader()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  owner_id uuid;
  mix_title text;
  uname text;
begin
  if tg_op <> 'INSERT' then
    return new;
  end if;

  select m.user_id, left(coalesce(m.title, 'Untitled Mix'), 80)
    into owner_id, mix_title
  from public.mixes m
  where m.id = new.mix_id;

  if owner_id is null
     or owner_id = new.user_id
     or not public.profile_can_use_app(owner_id)
  then
    return new;
  end if;

  select coalesce(nullif(trim(username), ''), 'Someone') into uname
  from public.profiles
  where id = new.user_id;

  insert into public.notifications (user_id, type, title, message, href, episode_id, meta)
  values (
    owner_id,
    'mix_presave',
    'New pre-save',
    coalesce(uname, 'Someone') || ' pre-saved "' || mix_title || '".',
    '/mix/' || new.mix_id::text,
    new.mix_id,
    jsonb_build_object(
      'actor_id', new.user_id::text,
      'actor_username', coalesce(uname, 'Someone'),
      'mix_id', new.mix_id::text,
      'reason', 'presave'
    )
  );

  return new;
end;
$$;

drop trigger if exists mix_presaves_notify_uploader on public.mix_presaves;
create trigger mix_presaves_notify_uploader
  after insert on public.mix_presaves
  for each row execute function public.mix_presaves_notify_uploader();
