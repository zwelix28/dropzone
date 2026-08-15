-- Replace legacy .svg mix covers with the standard Deep House Lab artwork.
-- The app serves this file from /public, so a site-relative path resolves
-- against the site origin wherever the cover is rendered.
-- Run in the Supabase SQL Editor.

update public.mixes
set cover_url = '/DeepHouseLabLogo.png'
where cover_url is not null
  and lower(split_part(split_part(cover_url, '?', 1), '#', 1)) like '%.svg';

-- Verify what remains (should return no rows):
-- select id, title, cover_url from public.mixes
-- where lower(split_part(split_part(cover_url, '?', 1), '#', 1)) like '%.svg';
