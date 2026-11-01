-- Database hook: notifications INSERT → notify-delivery edge function.
-- Do NOT also create a Dashboard Database Webhook for the same table (duplicates).
--
-- Before running: replace REPLACE_ME_NOTIFY_WEBHOOK_SECRET with the same value as
-- edge secret NOTIFY_WEBHOOK_SECRET.
-- Confirm: supabase functions deploy notify-delivery --no-verify-jwt
--
-- If you use the Dashboard Webhook UI instead:
--   Table: notifications | Events: INSERT
--   URL: https://puoszqxiugositqtfzlt.supabase.co/functions/v1/notify-delivery
--   HTTP Headers (not body):
--     Content-Type: application/json
--     x-notify-secret: <NOTIFY_WEBHOOK_SECRET>

create extension if not exists pg_net with schema extensions;

-- Remove common broken Dashboard webhook (secret accidentally placed in body).
drop trigger if exists notifications on public.notifications;

create or replace function public.notify_delivery_on_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform net.http_post(
    url := 'https://puoszqxiugositqtfzlt.supabase.co/functions/v1/notify-delivery',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-notify-secret', 'REPLACE_ME_NOTIFY_WEBHOOK_SECRET'
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
