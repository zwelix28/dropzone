-- Concurrent listeners for a mix (from user_presence heartbeats).
-- Run in Supabase SQL Editor after admin-analytics.sql.

create index if not exists idx_user_presence_mix_streaming
  on public.user_presence (mix_id)
  where is_streaming = true and mix_id is not null;

create or replace function public.get_mix_active_listener_count(p_mix_id uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::int
  from public.user_presence
  where p_mix_id is not null
    and mix_id = p_mix_id
    and is_streaming = true
    and last_seen_at > now() - interval '2 minutes';
$$;

revoke all on function public.get_mix_active_listener_count(uuid) from public;
grant execute on function public.get_mix_active_listener_count(uuid) to anon, authenticated;
