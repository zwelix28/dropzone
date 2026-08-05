-- Restrict mix uploads to admin users only.
-- Run in Supabase SQL Editor after base schema.

drop policy if exists "mixes_insert_own" on public.mixes;
drop policy if exists "mixes_insert_admin" on public.mixes;

create policy "mixes_insert_admin" on public.mixes
  for insert to authenticated
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and coalesce(p.is_admin, false) = true
        and coalesce(p.is_banned, false) = false
    )
  );
