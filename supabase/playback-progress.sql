-- Per-user mix playback resume positions.
-- Run in Supabase SQL Editor so signed-in listeners can continue where they left off.

create table if not exists public.playback_progress (
  user_id uuid not null references auth.users (id) on delete cascade,
  mix_id uuid not null references public.mixes (id) on delete cascade,
  position_sec double precision not null default 0,
  duration_sec double precision not null default 0,
  total_listened_sec double precision not null default 0,
  last_reported_sec double precision not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, mix_id),
  constraint playback_progress_position_nonneg check (position_sec >= 0)
);

create index if not exists idx_playback_progress_user_updated
  on public.playback_progress (user_id, updated_at desc);

alter table public.playback_progress enable row level security;

grant select, insert, update, delete on public.playback_progress to authenticated;

drop policy if exists "playback_progress_select_own" on public.playback_progress;
create policy "playback_progress_select_own" on public.playback_progress
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "playback_progress_insert_own" on public.playback_progress;
create policy "playback_progress_insert_own" on public.playback_progress
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and not exists (select 1 from public.profiles p where p.id = auth.uid() and coalesce(p.is_banned, false))
  );

drop policy if exists "playback_progress_update_own" on public.playback_progress;
create policy "playback_progress_update_own" on public.playback_progress
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "playback_progress_delete_own" on public.playback_progress;
create policy "playback_progress_delete_own" on public.playback_progress
  for delete to authenticated
  using (user_id = auth.uid());
