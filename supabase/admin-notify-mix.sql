-- Admin: manually broadcast a new_mix notification for an existing approved mix.
-- Inserts in-app rows for approved members with email/push prefs on (not banned).
-- Edge function notify-delivery still respects each user's notify_* prefs for email/push.
--
-- Run in Supabase SQL Editor (safe to re-run).

create or replace function public.admin_notify_mix(p_mix_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  mix_row public.mixes%rowtype;
  uname text;
  recipient uuid;
  n_inserted int := 0;
begin
  if auth.uid() is null
     or not exists (
       select 1 from public.profiles p
       where p.id = auth.uid() and coalesce(p.is_admin, false) = true
     ) then
    raise exception 'Admin only';
  end if;

  if p_mix_id is null then
    raise exception 'Mix id required';
  end if;

  select * into mix_row from public.mixes where id = p_mix_id;
  if not found then
    raise exception 'Mix not found';
  end if;
  if coalesce(mix_row.status, 'approved') <> 'approved' then
    raise exception 'Only approved mixes can be broadcast';
  end if;

  select coalesce(username, 'Someone') into uname
  from public.profiles
  where id = mix_row.user_id;

  for recipient in
    select p.id
    from public.profiles p
    where p.id is distinct from mix_row.user_id
      and coalesce(p.is_banned, false) = false
      and public.profile_can_use_app(p.id)
      and (
        coalesce(p.notify_email_new_mix, true) = true
        or coalesce(p.notify_push_new_mix, true) = true
      )
  loop
    insert into public.notifications (user_id, type, title, message, href, episode_id, meta)
    values (
      recipient,
      'new_mix',
      'New mix from ' || coalesce(uname, 'Someone'),
      coalesce(uname, 'Someone') || ' uploaded "' || left(coalesce(mix_row.title, 'Untitled Mix'), 80) || '".',
      '/mix/' || mix_row.id::text,
      mix_row.id,
      jsonb_build_object(
        'uploader_id', mix_row.user_id::text,
        'uploader_username', coalesce(uname, 'Someone'),
        'manual', true,
        'admin_id', auth.uid()::text
      )
    );
    n_inserted := n_inserted + 1;
  end loop;

  return jsonb_build_object(
    'ok', true,
    'mix_id', mix_row.id,
    'title', mix_row.title,
    'recipients', n_inserted
  );
end;
$$;

revoke all on function public.admin_notify_mix(uuid) from public;
grant execute on function public.admin_notify_mix(uuid) to authenticated;
