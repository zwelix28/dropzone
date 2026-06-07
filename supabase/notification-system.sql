-- Accurate notifications: new mixes from followed DJs + play milestones.
-- Run in Supabase SQL Editor on existing projects.

create or replace function public.notify_mix_play_milestones(
  p_mix_id uuid,
  p_owner_id uuid,
  p_title text,
  p_old_plays int,
  p_new_plays int
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  m int;
  milestones int[] := array[10, 50, 100, 250, 500, 1000, 5000, 10000, 50000, 100000];
begin
  if p_owner_id is null then
    return;
  end if;

  foreach m in array milestones loop
    if p_old_plays < m and p_new_plays >= m then
      insert into public.notifications (user_id, type, title, message, href, episode_id, meta)
      select
        p_owner_id,
        'milestone',
        'Play milestone',
        '"' || left(coalesce(p_title, 'Your mix'), 80) || '" reached ' || m::text || ' plays!',
        '/mix/' || p_mix_id::text,
        p_mix_id,
        jsonb_build_object('kind', 'play', 'milestone', m)
      where not exists (
        select 1
        from public.notifications n
        where n.user_id = p_owner_id
          and n.episode_id = p_mix_id
          and n.type = 'milestone'
          and coalesce(n.meta->>'kind', '') = 'play'
          and (n.meta->>'milestone')::int = m
      );
    end if;
  end loop;
end;
$$;

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
  after insert on public.mixes
  for each row execute function public.notify_followers_new_mix();

create or replace function public.record_mix_interaction(p_mix_id uuid, p_kind text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  m public.mixes%rowtype;
  actor uuid;
  old_plays int;
  new_plays int;
begin
  actor := auth.uid();
  if exists (select 1 from public.profiles where id = actor and coalesce(is_banned, false)) then
    return;
  end if;

  select * into m from public.mixes where id = p_mix_id;
  if not found then
    return;
  end if;

  old_plays := m.plays;

  if p_kind = 'play' then
    update public.mixes set plays = plays + 1 where id = p_mix_id returning plays into new_plays;
    perform public.notify_mix_play_milestones(p_mix_id, m.user_id, m.title, old_plays, new_plays);
  elsif p_kind = 'download' then
    update public.mixes set downloads = downloads + 1 where id = p_mix_id;
  elsif p_kind = 'share' then
    update public.mixes set shares = shares + 1 where id = p_mix_id;
  else
    return;
  end if;

  if p_kind in ('download', 'share') and m.user_id is distinct from actor then
    insert into public.notifications (user_id, type, title, message, href, episode_id, meta)
    values (
      m.user_id,
      p_kind,
      case p_kind when 'download' then 'New download' else 'New share' end,
      case p_kind
        when 'download' then 'Someone downloaded "' || left(m.title, 80) || '".'
        else 'Someone shared "' || left(m.title, 80) || '".'
      end,
      '/mix/' || p_mix_id::text,
      p_mix_id,
      jsonb_build_object('kind', p_kind)
    );
  end if;
end;
$$;

grant execute on function public.notify_mix_play_milestones(uuid, uuid, text, int, int) to authenticated;
grant execute on function public.record_mix_interaction(uuid, text) to anon, authenticated;
