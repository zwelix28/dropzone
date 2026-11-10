-- P0: Enforce account approval beyond the UI gate.
-- Run in Supabase SQL Editor AFTER user-approval.sql.
-- Safe to re-run (CREATE OR REPLACE / DROP POLICY IF EXISTS).

-- ---------------------------------------------------------------------------
-- Shared helper: approved (or admin) and not banned
-- ---------------------------------------------------------------------------
create or replace function public.profile_can_use_app(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = p_user_id
      and coalesce(p.is_banned, false) = false
      and (
        coalesce(p.is_admin, false) = true
        or p.is_approved = true
      )
  );
$$;

revoke all on function public.profile_can_use_app(uuid) from public;
grant execute on function public.profile_can_use_app(uuid) to authenticated;
grant execute on function public.profile_can_use_app(uuid) to service_role;

-- ---------------------------------------------------------------------------
-- Direct messages
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

  if not public.profile_can_use_app(me) then
    raise exception 'account pending approval';
  end if;
  if not public.profile_can_use_app(p_peer_id) then
    raise exception 'peer unavailable';
  end if;

  if not public.dm_mutual_follow(me, p_peer_id) then
    raise exception 'mutual follow required';
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

  if not public.profile_can_use_app(me) then
    raise exception 'account pending approval';
  end if;
  if not public.profile_can_use_app(p_peer_id) then
    raise exception 'peer unavailable';
  end if;

  trimmed := trim(p_body);
  if length(trimmed) < 1 or length(trimmed) > 4000 then
    raise exception 'invalid body';
  end if;

  if not public.dm_mutual_follow(me, p_peer_id) then
    raise exception 'mutual follow required';
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
-- Follows
-- ---------------------------------------------------------------------------
drop policy if exists "follows_insert_own" on public.follows;
create policy "follows_insert_own" on public.follows for insert to authenticated
  with check (
    follower_id = auth.uid()
    and following_id <> auth.uid()
    and public.profile_can_use_app(auth.uid())
    and public.profile_can_use_app(following_id)
  );

-- ---------------------------------------------------------------------------
-- Mix comments (approved accounts; only on live mixes)
-- ---------------------------------------------------------------------------
drop policy if exists "mix_comments_insert_own" on public.mix_comments;
create policy "mix_comments_insert_own"
  on public.mix_comments for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and public.profile_can_use_app(auth.uid())
    and exists (
      select 1
      from public.mixes m
      where m.id = mix_id
        and coalesce(m.status, 'approved') = 'approved'
    )
  );

-- ---------------------------------------------------------------------------
-- Storage uploads (pending users cannot fill mix buckets)
-- ---------------------------------------------------------------------------
drop policy if exists "mix_audio_auth_upload" on storage.objects;
create policy "mix_audio_auth_upload" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'mix-audio'
    and (storage.foldername(name))[1] = auth.uid()::text
    and public.profile_can_use_app(auth.uid())
  );

drop policy if exists "mix_covers_auth_upload" on storage.objects;
create policy "mix_covers_auth_upload" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'mix-covers'
    and (storage.foldername(name))[1] = auth.uid()::text
    and public.profile_can_use_app(auth.uid())
  );

drop policy if exists "mix_previews_auth_insert" on storage.objects;
create policy "mix_previews_auth_insert" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'mix-previews'
    and (storage.foldername(name))[1] = auth.uid()::text
    and public.profile_can_use_app(auth.uid())
  );

-- ---------------------------------------------------------------------------
-- Push subscriptions
-- ---------------------------------------------------------------------------
drop policy if exists "push_subscriptions_insert_own" on public.push_subscriptions;
create policy "push_subscriptions_insert_own"
  on public.push_subscriptions for insert to authenticated
  with check (
    auth.uid() = user_id
    and public.profile_can_use_app(auth.uid())
  );

-- ---------------------------------------------------------------------------
-- Submission insert policies: fail-closed on is_approved
-- ---------------------------------------------------------------------------
drop policy if exists "mixes_insert_submission" on public.mixes;
create policy "mixes_insert_submission" on public.mixes for insert to authenticated
  with check (
    auth.uid() = user_id
    and status = 'pending'
    and public.profile_can_use_app(auth.uid())
  );

drop policy if exists "floor_events_member_insert" on public.floor_events;
create policy "floor_events_member_insert"
  on public.floor_events
  for insert
  to authenticated
  with check (
    auth.uid() = submitter_id
    and status = 'pending'
    and is_published = false
    and is_featured = false
    and public.profile_can_use_app(auth.uid())
  );

-- ---------------------------------------------------------------------------
-- New-mix notifications: followers only (not site-wide broadcast)
-- ---------------------------------------------------------------------------
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
  if coalesce(new.status, 'approved') <> 'approved' then
    return new;
  end if;
  if tg_op = 'UPDATE' and coalesce(old.status, 'approved') = 'approved' then
    return new;
  end if;

  select coalesce(username, 'Someone') into uname from public.profiles where id = new.user_id;

  for follower in
    select f.follower_id
    from public.follows f
    where f.following_id = new.user_id
  loop
    if not public.profile_can_use_app(follower) then
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
