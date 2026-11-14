-- When a mix moves to live (from pre-save / hidden / first approve), notify:
--   1) followers of the uploader (existing “new mix” copy)
--   2) members who pre-saved the mix (“now live — ready to stream”)
-- Uses type = new_mix so email/push delivery (notify-delivery) still fires.
--
-- Run after mix-release-states.sql and mix-presaves.sql.

create or replace function public.notify_followers_new_mix()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  uname text;
  recipient uuid;
  was_live boolean;
  is_live boolean;
  is_presaver boolean;
  mix_title text;
  has_presaves boolean;
begin
  is_live :=
    coalesce(new.status, 'approved') = 'approved'
    and coalesce(new.visibility, 'live') = 'live';

  if not is_live then
    return new;
  end if;

  if tg_op = 'UPDATE' then
    was_live :=
      coalesce(old.status, 'approved') = 'approved'
      and coalesce(old.visibility, 'live') = 'live';
    if was_live then
      return new;
    end if;
  end if;

  mix_title := left(coalesce(new.title, 'Untitled Mix'), 80);
  select coalesce(nullif(trim(username), ''), 'Someone') into uname
  from public.profiles
  where id = new.user_id;

  has_presaves := to_regclass('public.mix_presaves') is not null;

  if has_presaves then
    for recipient in
      select distinct uid
      from (
        select f.follower_id as uid
        from public.follows f
        where f.following_id = new.user_id
        union
        select mp.user_id as uid
        from public.mix_presaves mp
        where mp.mix_id = new.id
      ) recipients
    loop
      if recipient is null or recipient = new.user_id then
        continue;
      end if;
      if not public.profile_can_use_app(recipient) then
        continue;
      end if;

      select exists (
        select 1
        from public.mix_presaves mp
        where mp.mix_id = new.id
          and mp.user_id = recipient
      ) into is_presaver;

      if is_presaver then
        insert into public.notifications (user_id, type, title, message, href, episode_id, meta)
        values (
          recipient,
          'new_mix',
          'Now live',
          '"' || mix_title || '" is ready to stream on Deep House Lab.',
          '/mix/' || new.id::text,
          new.id,
          jsonb_build_object(
            'uploader_id', new.user_id::text,
            'uploader_username', uname,
            'reason', 'presave_live'
          )
        );
      else
        insert into public.notifications (user_id, type, title, message, href, episode_id, meta)
        values (
          recipient,
          'new_mix',
          'New mix from ' || uname,
          uname || ' uploaded "' || mix_title || '".',
          '/mix/' || new.id::text,
          new.id,
          jsonb_build_object(
            'uploader_id', new.user_id::text,
            'uploader_username', uname,
            'reason', 'follower_new_mix'
          )
        );
      end if;
    end loop;
  else
    for recipient in
      select f.follower_id
      from public.follows f
      where f.following_id = new.user_id
    loop
      if recipient is null or recipient = new.user_id then
        continue;
      end if;
      if not public.profile_can_use_app(recipient) then
        continue;
      end if;

      insert into public.notifications (user_id, type, title, message, href, episode_id, meta)
      values (
        recipient,
        'new_mix',
        'New mix from ' || uname,
        uname || ' uploaded "' || mix_title || '".',
        '/mix/' || new.id::text,
        new.id,
        jsonb_build_object(
          'uploader_id', new.user_id::text,
          'uploader_username', uname,
          'reason', 'follower_new_mix'
        )
      );
    end loop;
  end if;

  return new;
end;
$$;

drop trigger if exists mixes_notify_followers on public.mixes;
create trigger mixes_notify_followers
  after insert or update of status, visibility on public.mixes
  for each row execute function public.notify_followers_new_mix();
