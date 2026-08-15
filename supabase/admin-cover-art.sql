-- Restrict mix cover-art replacements to administrators.
-- Initial cover selection remains available while a user submits a new mix;
-- this protects cover_url only on later UPDATE operations.
-- Run in the Supabase SQL Editor after mix-submissions.sql.

create or replace function public.mixes_protect_review_columns()
returns trigger
language plpgsql
as $$
declare
  adm boolean;
begin
  if auth.uid() is null then
    return new;
  end if;

  select coalesce(is_admin, false)
  into adm
  from public.profiles
  where id = auth.uid();

  if not coalesce(adm, false) then
    new.cover_url := old.cover_url;
    new.status := old.status;
    new.review_note := old.review_note;
    new.reviewed_at := old.reviewed_at;
    new.reviewed_by := old.reviewed_by;
    new.submitted_at := old.submitted_at;
  end if;

  return new;
end;
$$;

drop trigger if exists mixes_protect_review on public.mixes;
create trigger mixes_protect_review
  before update on public.mixes
  for each row execute function public.mixes_protect_review_columns();
