-- Listening totals for profile stats (run even if playback_progress already exists).

alter table public.playback_progress
  add column if not exists total_listened_sec double precision not null default 0,
  add column if not exists last_reported_sec double precision not null default 0;

comment on column public.playback_progress.total_listened_sec is
  'Cumulative seconds listened on this mix (all sessions).';
comment on column public.playback_progress.last_reported_sec is
  'Last position used when accumulating total_listened_sec.';
