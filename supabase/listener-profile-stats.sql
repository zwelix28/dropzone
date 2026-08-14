-- Public listening-taste stats for any profile (no resume positions leaked).
-- Run in Supabase SQL Editor after playback-progress.sql and mix-likes.sql.

create or replace function public.get_listener_profile_stats(p_user_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  total_sec double precision := 0;
  mixes_started int := 0;
  likes_n int := 0;
  most_listened text;
  most_liked text;
begin
  if p_user_id is null then
    return jsonb_build_object(
      'mixes_started', 0,
      'likes_count', 0,
      'hours_listened', 0,
      'total_listened_sec', 0,
      'most_liked_genre', null,
      'most_listened_genre', null
    );
  end if;

  select
    coalesce(sum(greatest(coalesce(pp.total_listened_sec, 0), coalesce(pp.position_sec, 0))), 0),
    count(*)::int
  into total_sec, mixes_started
  from public.playback_progress pp
  where pp.user_id = p_user_id;

  select count(*)::int into likes_n
  from public.mix_likes ml
  where ml.user_id = p_user_id;

  select m.genre into most_listened
  from public.playback_progress pp
  join public.mixes m on m.id = pp.mix_id
  where pp.user_id = p_user_id
    and nullif(trim(coalesce(m.genre, '')), '') is not null
  group by m.genre
  order by sum(greatest(coalesce(pp.total_listened_sec, 0), coalesce(pp.position_sec, 0))) desc
  limit 1;

  select m.genre into most_liked
  from public.mix_likes ml
  join public.mixes m on m.id = ml.mix_id
  where ml.user_id = p_user_id
    and nullif(trim(coalesce(m.genre, '')), '') is not null
  group by m.genre
  order by count(*) desc
  limit 1;

  return jsonb_build_object(
    'mixes_started', mixes_started,
    'likes_count', likes_n,
    'hours_listened', total_sec / 3600.0,
    'total_listened_sec', total_sec,
    'most_liked_genre', most_liked,
    'most_listened_genre', most_listened
  );
end;
$$;

revoke all on function public.get_listener_profile_stats(uuid) from public;
grant execute on function public.get_listener_profile_stats(uuid) to authenticated, anon;
