-- Publish tables to Supabase Realtime (run once in SQL Editor; safe to re-run).
-- - notifications: bell badge / list
-- - profiles: follower & following counts on /profile and /user/:id without manual refresh

do $$
begin
  alter publication supabase_realtime add table public.notifications;
exception
  when duplicate_object then
    null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.profiles;
exception
  when duplicate_object then
    null;
end $$;
