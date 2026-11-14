-- Pre-save bookmarks: members save upcoming mixes into Library before go-live.
-- Run after mix-release-states.sql.

create table if not exists public.mix_presaves (
  user_id uuid not null references auth.users on delete cascade,
  mix_id uuid not null references public.mixes on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, mix_id)
);

create index if not exists idx_mix_presaves_user_created
  on public.mix_presaves (user_id, created_at desc);

alter table public.mix_presaves enable row level security;

grant select, insert, delete on public.mix_presaves to authenticated;

drop policy if exists "mix_presaves_select_own" on public.mix_presaves;
create policy "mix_presaves_select_own" on public.mix_presaves
  for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "mix_presaves_insert_own" on public.mix_presaves;
create policy "mix_presaves_insert_own" on public.mix_presaves
  for insert to authenticated
  with check (
    auth.uid() = user_id
    and public.profile_can_use_app(auth.uid())
  );

drop policy if exists "mix_presaves_delete_own" on public.mix_presaves;
create policy "mix_presaves_delete_own" on public.mix_presaves
  for delete to authenticated
  using (auth.uid() = user_id);
