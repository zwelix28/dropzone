-- Move legacy songs (≤ 31 July 2026) to Discover as singles.
-- The Mixes page keeps full-length mixes uploaded after that date.
-- Run in Supabase SQL Editor.

-- Ensure column exists
alter table public.mixes
  add column if not exists content_type text not null default 'mix';

-- Drop check if present, then re-add (safe for re-runs)
do $$
begin
  alter table public.mixes drop constraint if exists mixes_content_type_check;
exception when undefined_object then
  null;
end $$;

alter table public.mixes
  drop constraint if exists mixes_content_type_check;

alter table public.mixes
  add constraint mixes_content_type_check
  check (content_type in ('single', 'mix'));

-- Songs uploaded on or before 31 July 2026 → Discover (single)
update public.mixes
set content_type = 'single',
    updated_at = now()
where created_at < timestamptz '2026-08-01 00:00:00+00';

-- Anything uploaded on/after 1 Aug 2026 stays a mix (Mixes page)
update public.mixes
set content_type = 'mix',
    updated_at = now()
where created_at >= timestamptz '2026-08-01 00:00:00+00';

-- Verify counts
select content_type, count(*) as n
from public.mixes
group by content_type
order by content_type;
