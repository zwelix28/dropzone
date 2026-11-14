-- Mix release states: hidden / pre-save / live.
-- Run in Supabase SQL Editor after mix-submissions.sql.
--
-- Catalog (members + guests via RLS):
--   approved + live     → listed and streamable
--   approved + presave  → listed with Pre-save tag + goes_live_at (not streamable)
--   approved + hidden   → not listed (admin/owner only)
-- Review status (pending/rejected) is unchanged.

alter table public.mixes
  add column if not exists visibility text not null default 'live';

alter table public.mixes
  add column if not exists goes_live_at timestamptz;

-- Existing approved catalog stays streamable until you change it in Admin.
update public.mixes
set visibility = 'live'
where visibility is null
   or visibility not in ('hidden', 'presave', 'live');

alter table public.mixes drop constraint if exists mixes_visibility_check;
alter table public.mixes add constraint mixes_visibility_check
  check (visibility in ('hidden', 'presave', 'live'));

create index if not exists idx_mixes_visibility_live
  on public.mixes (visibility, goes_live_at)
  where coalesce(status, 'approved') = 'approved';

-- Public catalog: approved live + pre-save. Hidden only for owner/admin.
drop policy if exists "mixes_select_approved" on public.mixes;
create policy "mixes_select_approved" on public.mixes for select
  using (
    (
      coalesce(status, 'approved') = 'approved'
      and coalesce(visibility, 'live') in ('live', 'presave')
    )
    or auth.uid() = user_id
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and coalesce(p.is_admin, false) = true
    )
  );

-- Owners must not self-publish via visibility / schedule columns.
create or replace function public.mixes_protect_review_columns()
returns trigger
language plpgsql
as $$
declare
  adm boolean;
begin
  if auth.uid() is null then
    return new;
  end if;
  select coalesce(is_admin, false) into adm from public.profiles where id = auth.uid();
  if not coalesce(adm, false) then
    new.cover_url := old.cover_url;
    new.status := old.status;
    new.review_note := old.review_note;
    new.reviewed_at := old.reviewed_at;
    new.reviewed_by := old.reviewed_by;
    new.submitted_at := old.submitted_at;
    new.visibility := old.visibility;
    new.goes_live_at := old.goes_live_at;
  end if;
  return new;
end;
$$;

-- Go-live alerts: followers + members who pre-saved the mix.
-- Prefer running supabase/mix-presave-go-live-notify.sql after mix-presaves.sql
-- for the full pre-save → live wording; this stub keeps visibility-aware triggers.
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
        select 1 from public.mix_presaves mp
        where mp.mix_id = new.id and mp.user_id = recipient
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

-- ---------------------------------------------------------------------------
-- Optional soft-launch seed (JUST DAZ Episodes). Uncomment and run once after
-- the columns above exist. Adjust goes_live_at for Episode #2 as needed.
-- ---------------------------------------------------------------------------
/*
update public.mixes
set visibility = 'hidden', goes_live_at = null
where coalesce(status, 'approved') = 'approved';

update public.mixes
set visibility = 'live', goes_live_at = null
where coalesce(status, 'approved') = 'approved'
  and title ilike '%JUST DAZ%Episode #1%';

update public.mixes
set
  visibility = 'presave',
  goes_live_at = timestamptz '2026-11-21 18:00:00+02'
where coalesce(status, 'approved') = 'approved'
  and title ilike '%JUST DAZ%Episode #2%';
*/
