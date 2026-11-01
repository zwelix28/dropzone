-- Optional: create the Database Webhook as a trigger (same effect as Dashboard → Database → Webhooks).
-- Prefer the Dashboard UI if you already created one — do not create duplicates.
--
-- Before running:
-- 1. Replace YOUR_NOTIFY_WEBHOOK_SECRET below with the same value as edge secret NOTIFY_WEBHOOK_SECRET
-- 2. Confirm notify-delivery is deployed with --no-verify-jwt
--
-- Dashboard alternative (recommended):
--   Table: notifications | Events: INSERT
--   URL: https://puoszqxiugositqtfzlt.supabase.co/functions/v1/notify-delivery
--   Headers:
--     Content-Type: application/json
--     x-notify-secret: <NOTIFY_WEBHOOK_SECRET>

create extension if not exists pg_net with schema extensions;

create or replace function public.notify_delivery_on_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Only new_mix rows are delivered by the edge function; still fire for all inserts
  -- so delivery stays centralized in notify-delivery (idempotent via meta.delivery.at).
  perform net.http_post(
    url := 'https://puoszqxiugositqtfzlt.supabase.co/functions/v1/notify-delivery',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-notify-secret', 'YOUR_NOTIFY_WEBHOOK_SECRET'
    ),
    body := jsonb_build_object('notification_id', new.id::text)
  );
  return new;
end;
$$;

drop trigger if exists notifications_notify_delivery on public.notifications;
create trigger notifications_notify_delivery
  after insert on public.notifications
  for each row
  execute function public.notify_delivery_on_insert();
