-- Mix likes (favorites) — run in SQL Editor after base schema + mixes + follows.
-- Lets signed-in users save mixes for quick replay from the Likes page.

create table if not exists public.mix_likes (
  user_id uuid not null references auth.users (id) on delete cascade,
  mix_id uuid not null references public.mixes (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, mix_id)
);

create index if not exists idx_mix_likes_user_created on public.mix_likes (user_id, created_at desc);
create index if not exists idx_mix_likes_mix on public.mix_likes (mix_id);

alter table public.mix_likes enable row level security;

grant select, insert, delete on public.mix_likes to authenticated;

drop policy if exists "mix_likes_select_own" on public.mix_likes;
create policy "mix_likes_select_own" on public.mix_likes for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "mix_likes_insert_own" on public.mix_likes;
create policy "mix_likes_insert_own" on public.mix_likes for insert to authenticated
  with check (
    user_id = auth.uid()
    and not exists (select 1 from public.profiles p where p.id = auth.uid() and coalesce(p.is_banned, false))
  );

drop policy if exists "mix_likes_delete_own" on public.mix_likes;
create policy "mix_likes_delete_own" on public.mix_likes for delete to authenticated
  using (user_id = auth.uid());

-- Keep admin bulk-remove in sync
create or replace function public.admin_remove_user_content(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_user_id = auth.uid() then
    raise exception 'cannot remove your own account this way';
  end if;
  if not exists (select 1 from public.profiles where id = auth.uid() and coalesce(is_admin, false)) then
    raise exception 'not allowed';
  end if;
  delete from public.mix_likes where user_id = p_user_id;
  delete from public.mix_likes where mix_id in (select id from public.mixes where user_id = p_user_id);
  delete from public.follows where follower_id = p_user_id or following_id = p_user_id;
  delete from public.mixes where user_id = p_user_id;
  update public.profiles
  set
    is_banned = true,
    username = 'Removed user',
    handle = '@removed',
    bio = ''
  where id = p_user_id;
end;
$$;
