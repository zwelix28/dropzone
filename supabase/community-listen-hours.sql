-- Returns total listened hours per user for community ranking.
-- Run in Supabase SQL Editor after playback-progress.sql.

create or replace function public.get_community_listen_hours()
returns table(user_id uuid, hours_listened double precision)
language sql
stable
security definer
set search_path = public
as $$
  select
    pp.user_id,
    coalesce(sum(greatest(coalesce(pp.total_listened_sec, 0), coalesce(pp.position_sec, 0))), 0) / 3600.0 as hours_listened
  from public.playback_progress pp
  group by pp.user_id;
$$;

revoke all on function public.get_community_listen_hours() from public;
grant execute on function public.get_community_listen_hours() to authenticated;
