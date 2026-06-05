-- Public like totals per mix (for Vault Feed and mix cards).
-- Run in Supabase SQL Editor after mix_likes exists.

alter table public.mixes add column if not exists likes_count int not null default 0;

update public.mixes m
set likes_count = coalesce(
  (select count(*)::int from public.mix_likes ml where ml.mix_id = m.id),
  0
);

create or replace function public.mix_likes_sync_counts()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.mixes set likes_count = likes_count + 1 where id = new.mix_id;
    return new;
  elsif tg_op = 'DELETE' then
    update public.mixes set likes_count = greatest(0, likes_count - 1) where id = old.mix_id;
    return old;
  end if;
  return null;
end;
$$;

drop trigger if exists mix_likes_after_insert on public.mix_likes;
create trigger mix_likes_after_insert
  after insert on public.mix_likes
  for each row execute function public.mix_likes_sync_counts();

drop trigger if exists mix_likes_after_delete on public.mix_likes;
create trigger mix_likes_after_delete
  after delete on public.mix_likes
  for each row execute function public.mix_likes_sync_counts();
