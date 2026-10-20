-- Point every mix cover at the standard Deep House Lab logo served from /public.
-- Run in the Supabase SQL Editor after deploying the new public/DeepHouseLabLogo.png.

update public.mixes
set cover_url = '/DeepHouseLabLogo.png'
where coalesce(cover_url, '') is distinct from '/DeepHouseLabLogo.png';

-- Optional verify:
-- select count(*) from public.mixes where cover_url = '/DeepHouseLabLogo.png';
