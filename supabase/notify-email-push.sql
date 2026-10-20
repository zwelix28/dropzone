-- Email + web-push delivery for in-app notifications (new mixes).
-- Run in Supabase SQL Editor after notification-system.sql / mix-submissions.sql.
--
-- After running this SQL:
-- 1. Deploy edge function: supabase functions deploy notify-delivery
-- 2. Set secrets: RESEND_API_KEY, EMAIL_FROM, PUBLIC_SITE_URL,
--    VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT,
--    NOTIFY_WEBHOOK_SECRET (REQUIRED — function fails closed without it)
-- 3. Database → Webhooks → Create a webhook:
--      Table: notifications | Events: INSERT
--      URL: https://YOUR_PROJECT.supabase.co/functions/v1/notify-delivery
--      HTTP Headers: Authorization: Bearer YOUR_ANON_OR_SERVICE_KEY
--                    x-notify-secret: YOUR_NOTIFY_WEBHOOK_SECRET
--      Delivery uses record.id only (reloaded from DB); only type = new_mix is emailed/pushed.

-- ---------------------------------------------------------------------------
-- Preference columns (default on)
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column if not exists notify_email_new_mix boolean not null default true;

alter table public.profiles
  add column if not exists notify_push_new_mix boolean not null default true;

-- ---------------------------------------------------------------------------
-- Web Push subscriptions (one row per browser/device endpoint)
-- ---------------------------------------------------------------------------
create table if not exists public.push_subscriptions (
  endpoint text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  p256dh text not null,
  auth text not null,
  user_agent text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_push_subscriptions_user
  on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

drop policy if exists "push_subscriptions_select_own" on public.push_subscriptions;
create policy "push_subscriptions_select_own"
  on public.push_subscriptions for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "push_subscriptions_insert_own" on public.push_subscriptions;
create policy "push_subscriptions_insert_own"
  on public.push_subscriptions for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "push_subscriptions_update_own" on public.push_subscriptions;
create policy "push_subscriptions_update_own"
  on public.push_subscriptions for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "push_subscriptions_delete_own" on public.push_subscriptions;
create policy "push_subscriptions_delete_own"
  on public.push_subscriptions for delete to authenticated
  using (auth.uid() = user_id);

grant select, insert, update, delete on public.push_subscriptions to authenticated;

-- ---------------------------------------------------------------------------
-- Broadcast new mixes to all approved listeners (not only followers).
-- Email/push still respect each user's notify_* preferences in the edge function.
-- ---------------------------------------------------------------------------
create or replace function public.notify_followers_new_mix()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  uname text;
  recipient uuid;
begin
  if coalesce(new.status, 'approved') <> 'approved' then
    return new;
  end if;
  if tg_op = 'UPDATE' and coalesce(old.status, 'approved') = 'approved' then
    return new;
  end if;

  select coalesce(username, 'Someone') into uname from public.profiles where id = new.user_id;

  for recipient in
    select p.id
    from public.profiles p
    where p.id <> new.user_id
      and coalesce(p.is_banned, false) = false
      and coalesce(p.is_approved, true) = true
  loop
    insert into public.notifications (user_id, type, title, message, href, episode_id, meta)
    values (
      recipient,
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
  after insert or update of status on public.mixes
  for each row execute function public.notify_followers_new_mix();
