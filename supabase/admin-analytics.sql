-- Admin analytics: live presence, login events, and admin insights RPC.
-- Run in Supabase SQL Editor after base schema + admin-dashboard.sql.

-- ---------------------------------------------------------------------------
-- Presence (heartbeat every ~30s from the client)
-- ---------------------------------------------------------------------------
create table if not exists public.user_presence (
  user_id uuid primary key references auth.users (id) on delete cascade,
  last_seen_at timestamptz not null default now(),
  is_streaming boolean not null default false,
  mix_id uuid references public.mixes (id) on delete set null,
  mix_title text default '',
  timezone text default '',
  region text default '',
  country text default '',
  page_path text default '',
  updated_at timestamptz not null default now()
);

create index if not exists idx_user_presence_last_seen on public.user_presence (last_seen_at desc);
create index if not exists idx_user_presence_streaming on public.user_presence (is_streaming) where is_streaming = true;

-- ---------------------------------------------------------------------------
-- Login events (deduped in RPC — at most one row per 30 minutes per user)
-- ---------------------------------------------------------------------------
create table if not exists public.user_login_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  timezone text default '',
  region text default '',
  country text default '',
  user_agent text default '',
  created_at timestamptz not null default now()
);

create index if not exists idx_user_login_events_user_created on public.user_login_events (user_id, created_at desc);
create index if not exists idx_user_login_events_created on public.user_login_events (created_at desc);

-- ---------------------------------------------------------------------------
-- RPC: heartbeat / streaming status
-- ---------------------------------------------------------------------------
create or replace function public.upsert_user_presence(
  p_is_streaming boolean default false,
  p_mix_id uuid default null,
  p_mix_title text default '',
  p_timezone text default '',
  p_region text default '',
  p_country text default '',
  p_page_path text default ''
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid;
begin
  uid := auth.uid();
  if uid is null then return; end if;
  if exists (select 1 from public.profiles where id = uid and coalesce(is_banned, false)) then
    return;
  end if;

  insert into public.user_presence (
    user_id, last_seen_at, is_streaming, mix_id, mix_title,
    timezone, region, country, page_path, updated_at
  )
  values (
    uid, now(), coalesce(p_is_streaming, false), p_mix_id, coalesce(p_mix_title, ''),
    coalesce(p_timezone, ''), coalesce(p_region, ''), coalesce(p_country, ''),
    coalesce(p_page_path, ''), now()
  )
  on conflict (user_id) do update set
    last_seen_at = now(),
    is_streaming = coalesce(excluded.is_streaming, false),
    mix_id = excluded.mix_id,
    mix_title = excluded.mix_title,
    timezone = excluded.timezone,
    region = excluded.region,
    country = excluded.country,
    page_path = excluded.page_path,
    updated_at = now();
end;
$$;

-- ---------------------------------------------------------------------------
-- RPC: record login (session start)
-- ---------------------------------------------------------------------------
create or replace function public.record_user_login(
  p_timezone text default '',
  p_region text default '',
  p_country text default '',
  p_user_agent text default ''
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid;
begin
  uid := auth.uid();
  if uid is null then return; end if;

  if exists (
    select 1 from public.user_login_events
    where user_id = uid and created_at > now() - interval '30 minutes'
  ) then
    return;
  end if;

  insert into public.user_login_events (user_id, timezone, region, country, user_agent)
  values (
    uid,
    coalesce(p_timezone, ''),
    coalesce(p_region, ''),
    coalesce(p_country, ''),
    left(coalesce(p_user_agent, ''), 500)
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- RPC: admin-only global analytics snapshot
-- ---------------------------------------------------------------------------
create or replace function public.admin_get_analytics()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  if not exists (
    select 1 from public.profiles where id = auth.uid() and coalesce(is_admin, false)
  ) then
    raise exception 'Admin only';
  end if;

  select jsonb_build_object(
    'generated_at', now(),
    'live', jsonb_build_object(
      'online_now', (
        select count(*)::int from public.user_presence
        where last_seen_at > now() - interval '2 minutes'
      ),
      'streaming_now', (
        select count(*)::int from public.user_presence
        where last_seen_at > now() - interval '2 minutes' and is_streaming = true
      ),
      'logins_24h', (
        select count(*)::int from public.user_login_events
        where created_at > now() - interval '24 hours'
      ),
      'logins_7d', (
        select count(*)::int from public.user_login_events
        where created_at > now() - interval '7 days'
      )
    ),
    'totals', jsonb_build_object(
      'users', (select count(*)::int from public.profiles),
      'mixes', (select count(*)::int from public.mixes),
      'total_plays', (select coalesce(sum(plays), 0)::bigint from public.mixes),
      'total_downloads', (select coalesce(sum(downloads), 0)::bigint from public.mixes),
      'total_follows', (select count(*)::int from public.follows)
    ),
    'active_users', coalesce((
      select jsonb_agg(row_to_json(t) order by t.last_seen_at desc)
      from (
        select
          p.id as user_id,
          p.username,
          p.handle,
          pr.is_streaming,
          pr.mix_title,
          pr.timezone,
          pr.region,
          pr.country,
          pr.page_path,
          pr.last_seen_at
        from public.user_presence pr
        join public.profiles p on p.id = pr.user_id
        where pr.last_seen_at > now() - interval '2 minutes'
        order by pr.last_seen_at desc
        limit 40
      ) t
    ), '[]'::jsonb),
    'top_streamed', coalesce((
      select jsonb_agg(row_to_json(t))
      from (
        select m.id, m.title, m.plays, m.downloads, m.genre, m.trending,
               p.username as artist, p.handle as artist_handle
        from public.mixes m
        join public.profiles p on p.id = m.user_id
        order by m.plays desc nulls last, m.created_at desc
        limit 10
      ) t
    ), '[]'::jsonb),
    'top_downloaded', coalesce((
      select jsonb_agg(row_to_json(t))
      from (
        select m.id, m.title, m.downloads, m.plays, m.genre,
               p.username as artist, p.handle as artist_handle
        from public.mixes m
        join public.profiles p on p.id = m.user_id
        order by m.downloads desc nulls last, m.created_at desc
        limit 10
      ) t
    ), '[]'::jsonb),
    'trending', coalesce((
      select jsonb_agg(row_to_json(t))
      from (
        select m.id, m.title, m.plays, m.trending, m.genre,
               p.username as artist, p.handle as artist_handle
        from public.mixes m
        join public.profiles p on p.id = m.user_id
        order by m.trending asc nulls last, m.plays desc, m.created_at desc
        limit 10
      ) t
    ), '[]'::jsonb),
    'top_followed', coalesce((
      select jsonb_agg(row_to_json(t))
      from (
        select id, username, handle, followers_count, verified, location, genre
        from public.profiles
        order by followers_count desc nulls last, created_at desc
        limit 10
      ) t
    ), '[]'::jsonb),
    'top_logins_7d', coalesce((
      select jsonb_agg(row_to_json(t))
      from (
        select p.id, p.username, p.handle, count(*)::int as login_count,
               max(e.created_at) as last_login
        from public.user_login_events e
        join public.profiles p on p.id = e.user_id
        where e.created_at > now() - interval '7 days'
        group by p.id, p.username, p.handle
        order by login_count desc, last_login desc
        limit 15
      ) t
    ), '[]'::jsonb),
    'locations', coalesce((
      select jsonb_agg(row_to_json(t))
      from (
        select
          coalesce(nullif(country, ''), nullif(timezone, ''), 'Unknown') as label,
          count(*)::int as sessions
        from public.user_login_events
        where created_at > now() - interval '7 days'
        group by 1
        order by sessions desc
        limit 15
      ) t
    ), '[]'::jsonb),
    'active_locations', coalesce((
      select jsonb_agg(row_to_json(t))
      from (
        select
          coalesce(nullif(country, ''), nullif(timezone, ''), 'Unknown') as label,
          count(*)::int as online
        from public.user_presence
        where last_seen_at > now() - interval '2 minutes'
        group by 1
        order by online desc
        limit 10
      ) t
    ), '[]'::jsonb)
  ) into result;

  return result;
end;
$$;

grant execute on function public.upsert_user_presence(boolean, uuid, text, text, text, text, text) to authenticated;
grant execute on function public.record_user_login(text, text, text, text) to authenticated;
grant execute on function public.admin_get_analytics() to authenticated;

alter table public.user_presence enable row level security;
alter table public.user_login_events enable row level security;

drop policy if exists "user_presence_upsert_own" on public.user_presence;
-- Presence is written via security definer RPC only; no direct client writes needed.
drop policy if exists "user_presence_admin_select" on public.user_presence;
create policy "user_presence_admin_select" on public.user_presence for select to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true));

drop policy if exists "user_login_events_admin_select" on public.user_login_events;
create policy "user_login_events_admin_select" on public.user_login_events for select to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true));
