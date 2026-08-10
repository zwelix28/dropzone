-- @mention notifications when users tag each other in mix comments.
-- Run in Supabase SQL Editor after mix-comments.sql and notification schema.

create or replace function public.normalize_profile_handle(raw text)
returns text
language sql
immutable
as $$
  select lower(regexp_replace(trim(coalesce(raw, '')), '^@', ''));
$$;

create or replace function public.notify_mix_comment_mentions()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  author_name text;
  mix_title text;
  mention_token text;
  mentioned_id uuid;
  seen_ids uuid[] := '{}';
begin
  select coalesce(username, 'Someone') into author_name from public.profiles where id = new.user_id;
  select coalesce(title, 'a mix') into mix_title from public.mixes where id = new.mix_id;

  for mention_token in
    select distinct lower(m[1])
    from regexp_matches(coalesce(new.body, ''), '@([a-zA-Z0-9_.]+)', 'g') as m
  loop
    select p.id into mentioned_id
    from public.profiles p
    where public.normalize_profile_handle(p.handle) = mention_token
       or lower(replace(trim(coalesce(p.username, '')), ' ', '')) = mention_token
    order by
      case when public.normalize_profile_handle(p.handle) = mention_token then 0 else 1 end,
      p.created_at nulls last
    limit 1;

    if mentioned_id is null then
      continue;
    end if;
    if mentioned_id = new.user_id then
      continue;
    end if;
    if mentioned_id = any(seen_ids) then
      continue;
    end if;
    if exists (
      select 1 from public.profiles
      where id = mentioned_id and coalesce(is_banned, false)
    ) then
      continue;
    end if;

    seen_ids := array_append(seen_ids, mentioned_id);

    insert into public.notifications (user_id, type, title, message, href, episode_id, meta)
    values (
      mentioned_id,
      'mention',
      author_name || ' mentioned you',
      left(trim(new.body), 140),
      '/foryou?mix=' || new.mix_id::text || '&comments=1&comment=' || new.id::text,
      new.mix_id,
      jsonb_build_object(
        'comment_id', new.id::text,
        'mix_id', new.mix_id::text,
        'from_id', new.user_id::text,
        'from_username', author_name,
        'mix_title', mix_title
      )
    );
  end loop;

  return new;
end;
$$;

drop trigger if exists trg_mix_comment_mentions on public.mix_comments;
create trigger trg_mix_comment_mentions
  after insert on public.mix_comments
  for each row execute function public.notify_mix_comment_mentions();
