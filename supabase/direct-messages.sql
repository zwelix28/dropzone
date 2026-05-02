-- Direct messages: mutual followers only. Run in Supabase SQL Editor after base schema + follows.
-- Also add tables to Realtime publication at the bottom.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
create table if not exists public.dm_threads (
  id uuid primary key default gen_random_uuid(),
  user1_id uuid not null references auth.users (id) on delete cascade,
  user2_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_message_preview text not null default '',
  constraint dm_threads_ordered check (user1_id < user2_id),
  constraint dm_threads_unique_pair unique (user1_id, user2_id)
);

create index if not exists idx_dm_threads_u1 on public.dm_threads (user1_id);
create index if not exists idx_dm_threads_u2 on public.dm_threads (user2_id);
create index if not exists idx_dm_threads_updated on public.dm_threads (updated_at desc);

create table if not exists public.dm_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.dm_threads (id) on delete cascade,
  sender_id uuid not null references auth.users (id) on delete cascade,
  body text not null,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  constraint dm_messages_body_len check (char_length(body) >= 1 and char_length(body) <= 4000)
);

create index if not exists idx_dm_messages_thread_created on public.dm_messages (thread_id, created_at desc);
create index if not exists idx_dm_messages_unread on public.dm_messages (thread_id) where read_at is null;

-- ---------------------------------------------------------------------------
-- Helpers (security definer)
-- ---------------------------------------------------------------------------
create or replace function public.dm_mutual_follow(a uuid, b uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.follows x
    join public.follows y
      on x.follower_id = a and x.following_id = b
     and y.follower_id = b and y.following_id = a
  );
$$;

-- ---------------------------------------------------------------------------
-- RPC: ensure thread exists (no message, no notification)
-- ---------------------------------------------------------------------------
create or replace function public.ensure_direct_message_thread(p_peer_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  a uuid;
  b uuid;
  tid uuid;
begin
  if me is null then
    raise exception 'not authenticated';
  end if;
  if p_peer_id is null or p_peer_id = me then
    raise exception 'invalid peer';
  end if;

  if not public.dm_mutual_follow(me, p_peer_id) then
    raise exception 'mutual follow required';
  end if;

  if exists (select 1 from public.profiles where id = me and coalesce(is_banned, false)) then
    raise exception 'banned';
  end if;
  if exists (select 1 from public.profiles where id = p_peer_id and coalesce(is_banned, false)) then
    raise exception 'peer banned';
  end if;

  if me < p_peer_id then
    a := me;
    b := p_peer_id;
  else
    a := p_peer_id;
    b := me;
  end if;

  insert into public.dm_threads (user1_id, user2_id)
  values (a, b)
  on conflict (user1_id, user2_id) do nothing;

  select t.id into tid
  from public.dm_threads t
  where t.user1_id = a and t.user2_id = b;

  return tid;
end;
$$;

-- ---------------------------------------------------------------------------
-- RPC: send message + notify recipient
-- ---------------------------------------------------------------------------
create or replace function public.send_direct_message(p_peer_id uuid, p_body text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  a uuid;
  b uuid;
  tid uuid;
  msg_id uuid;
  trimmed text;
  sender_name text;
begin
  if me is null then
    raise exception 'not authenticated';
  end if;
  if p_peer_id is null or p_peer_id = me then
    raise exception 'invalid peer';
  end if;

  trimmed := trim(p_body);
  if length(trimmed) < 1 or length(trimmed) > 4000 then
    raise exception 'invalid body';
  end if;

  if not public.dm_mutual_follow(me, p_peer_id) then
    raise exception 'mutual follow required';
  end if;

  if exists (select 1 from public.profiles where id = me and coalesce(is_banned, false)) then
    raise exception 'banned';
  end if;
  if exists (select 1 from public.profiles where id = p_peer_id and coalesce(is_banned, false)) then
    raise exception 'peer banned';
  end if;

  if me < p_peer_id then
    a := me;
    b := p_peer_id;
  else
    a := p_peer_id;
    b := me;
  end if;

  insert into public.dm_threads (user1_id, user2_id)
  values (a, b)
  on conflict (user1_id, user2_id) do nothing;

  select t.id into tid
  from public.dm_threads t
  where t.user1_id = a and t.user2_id = b;

  insert into public.dm_messages (thread_id, sender_id, body)
  values (tid, me, trimmed)
  returning id into msg_id;

  update public.dm_threads
  set
    updated_at = now(),
    last_message_preview = left(trimmed, 200)
  where id = tid;

  select coalesce(username, 'Someone') into sender_name from public.profiles where id = me;

  insert into public.notifications (user_id, type, title, message, href, read, meta)
  values (
    p_peer_id,
    'dm',
    sender_name || ' sent a message',
    left(trimmed, 140),
    '/messages/' || tid::text,
    false,
    jsonb_build_object('thread_id', tid::text, 'message_id', msg_id::text, 'from_id', me::text)
  );

  return msg_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- RPC: mark incoming messages in thread read + matching dm notifications
-- ---------------------------------------------------------------------------
create or replace function public.mark_dm_thread_read(p_thread_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
begin
  if me is null then
    raise exception 'not authenticated';
  end if;

  if not exists (
    select 1 from public.dm_threads t
    where t.id = p_thread_id
      and (t.user1_id = me or t.user2_id = me)
  ) then
    raise exception 'not a participant';
  end if;

  update public.dm_messages m
  set read_at = coalesce(m.read_at, now())
  where m.thread_id = p_thread_id
    and m.sender_id <> me
    and m.read_at is null;

  update public.notifications n
  set read = true
  where n.user_id = me
    and n.type = 'dm'
    and n.read = false
    and coalesce(n.meta->>'thread_id', '') = p_thread_id::text;
end;
$$;

-- ---------------------------------------------------------------------------
-- RPC: mark a thread unread (sets latest incoming message read_at back to NULL)
-- and marks dm notifications for that thread unread (bell + badge).
-- ---------------------------------------------------------------------------
create or replace function public.mark_dm_thread_unread(p_thread_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  mid uuid;
begin
  if me is null then
    raise exception 'not authenticated';
  end if;

  if not exists (
    select 1 from public.dm_threads t
    where t.id = p_thread_id
      and (t.user1_id = me or t.user2_id = me)
  ) then
    raise exception 'not a participant';
  end if;

  -- Find the most recent incoming message.
  select m.id into mid
  from public.dm_messages m
  where m.thread_id = p_thread_id
    and m.sender_id <> me
  order by m.created_at desc
  limit 1;

  if mid is not null then
    update public.dm_messages
    set read_at = null
    where id = mid;
  end if;

  update public.notifications n
  set read = false
  where n.user_id = me
    and n.type = 'dm'
    and coalesce(n.meta->>'thread_id', '') = p_thread_id::text;
end;
$$;

-- ---------------------------------------------------------------------------
-- RPC: mark all incoming DMs read (for “mark all notifications read” sync)
-- ---------------------------------------------------------------------------
create or replace function public.mark_all_incoming_dm_read()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
begin
  if me is null then
    raise exception 'not authenticated';
  end if;

  update public.dm_messages m
  set read_at = coalesce(m.read_at, now())
  from public.dm_threads t
  where m.thread_id = t.id
    and (t.user1_id = me or t.user2_id = me)
    and m.sender_id <> me
    and m.read_at is null;
end;
$$;

-- ---------------------------------------------------------------------------
-- RPC: unread count for inbox badge
-- ---------------------------------------------------------------------------
create or replace function public.dm_unread_count()
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::int
  from public.dm_messages m
  join public.dm_threads t on t.id = m.thread_id
  where (t.user1_id = auth.uid() or t.user2_id = auth.uid())
    and m.sender_id is distinct from auth.uid()
    and m.read_at is null;
$$;

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------
grant select on public.dm_threads to authenticated;
grant select on public.dm_messages to authenticated;
grant execute on function public.ensure_direct_message_thread(uuid) to authenticated;
grant execute on function public.send_direct_message(uuid, text) to authenticated;
grant execute on function public.mark_dm_thread_read(uuid) to authenticated;
grant execute on function public.mark_dm_thread_unread(uuid) to authenticated;
grant execute on function public.mark_all_incoming_dm_read() to authenticated;
grant execute on function public.dm_unread_count() to authenticated;

-- ---------------------------------------------------------------------------
-- RPC: inbox rows for current user
-- ---------------------------------------------------------------------------
create or replace function public.list_dm_inbox()
returns table (
  thread_id uuid,
  peer_id uuid,
  last_preview text,
  thread_updated_at timestamptz,
  unread_count bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select
    t.id,
    case when t.user1_id = auth.uid() then t.user2_id else t.user1_id end,
    t.last_message_preview,
    t.updated_at,
    (
      select count(*)::bigint
      from public.dm_messages m
      where m.thread_id = t.id
        and m.sender_id is distinct from auth.uid()
        and m.read_at is null
    )
  from public.dm_threads t
  where t.user1_id = auth.uid() or t.user2_id = auth.uid()
  order by t.updated_at desc;
$$;

grant execute on function public.list_dm_inbox() to authenticated;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.dm_threads enable row level security;
alter table public.dm_messages enable row level security;

drop policy if exists "dm_threads_select_participant" on public.dm_threads;
create policy "dm_threads_select_participant" on public.dm_threads
  for select to authenticated
  using (auth.uid() = user1_id or auth.uid() = user2_id);

drop policy if exists "dm_messages_select_participant" on public.dm_messages;
create policy "dm_messages_select_participant" on public.dm_messages
  for select to authenticated
  using (
    exists (
      select 1 from public.dm_threads t
      where t.id = thread_id
        and (t.user1_id = auth.uid() or t.user2_id = auth.uid())
    )
  );

-- Inserts only via SECURITY DEFINER RPCs (no insert policy for authenticated)

-- ---------------------------------------------------------------------------
-- Realtime (optional; safe to re-run)
-- ---------------------------------------------------------------------------
do $$
begin
  alter publication supabase_realtime add table public.dm_threads;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.dm_messages;
exception
  when duplicate_object then null;
end $$;
