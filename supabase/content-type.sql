-- Single vs Mix content types.
-- Singles appear on Discover; full-length mixes appear on the Mixes page.
-- Run in Supabase SQL Editor after base schema.

alter table public.mixes
  add column if not exists content_type text not null default 'mix'
  check (content_type in ('single', 'mix'));

create index if not exists idx_mixes_content_type on public.mixes (content_type, created_at desc);

comment on column public.mixes.content_type is
  'single = short track (Discover); mix = full-length upload (Mixes page)';
