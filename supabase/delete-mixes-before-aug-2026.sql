-- Permanently delete mixes uploaded on or before 31 July 2026.
-- Related likes, comments, purchases, and playback_progress cascade automatically.
-- Notifications.episode_id is set null where configured.
--
-- IMPORTANT: Run in Supabase SQL Editor (service role). This cannot be undone.
-- Storage audio/cover files are NOT deleted by this script — clean those in
-- Dashboard → Storage if you want to free space.

-- Preview what will be removed
select id, title, created_at, audio_storage_path
from public.mixes
where created_at < timestamptz '2026-08-01 00:00:00+00'
order by created_at;

-- Delete
delete from public.mixes
where created_at < timestamptz '2026-08-01 00:00:00+00';

-- Remaining catalog
select id, title, created_at
from public.mixes
order by created_at;
