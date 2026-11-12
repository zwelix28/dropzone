-- Username / handle login helpers + uniqueness.
-- Run in Supabase SQL Editor after base schema / user-approval.sql.

-- ---------------------------------------------------------------------------
-- Uniqueness (case-insensitive) for display names and handles
-- ---------------------------------------------------------------------------
create unique index if not exists profiles_username_lower_uidx
  on public.profiles (lower(trim(username)))
  where trim(coalesce(username, '')) <> ''
    and lower(trim(username)) not in ('dj', 'removed user');

create unique index if not exists profiles_handle_lower_uidx
  on public.profiles (lower(regexp_replace(coalesce(handle, ''), '^@', '')))
  where coalesce(handle, '') <> ''
    and lower(regexp_replace(handle, '^@', '')) not in ('dj', 'removed');

-- ---------------------------------------------------------------------------
-- Resolve email for username-or-email sign-in (security definer).
-- Client never needs to read auth.users; returns null when not found.
-- ---------------------------------------------------------------------------
create or replace function public.resolve_login_email(p_identifier text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  ident text := lower(trim(coalesce(p_identifier, '')));
  uid uuid;
  mail text;
begin
  if ident = '' then
    return null;
  end if;

  -- Email-shaped identifiers: return normalized email if an auth user exists.
  if position('@' in ident) > 1 then
    select u.email into mail
    from auth.users u
    where lower(u.email) = ident
    limit 1;
    return mail;
  end if;

  ident := regexp_replace(ident, '^@+', '');

  select p.id into uid
  from public.profiles p
  where lower(trim(coalesce(p.username, ''))) = ident
     or lower(regexp_replace(coalesce(p.handle, ''), '^@', '')) = ident
  order by
    case when lower(trim(coalesce(p.username, ''))) = ident then 0 else 1 end
  limit 1;

  if uid is null then
    return null;
  end if;

  select u.email into mail from auth.users u where u.id = uid limit 1;
  return mail;
end;
$$;

revoke all on function public.resolve_login_email(text) from public;
grant execute on function public.resolve_login_email(text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Username availability (+ a few alternate suggestions)
-- ---------------------------------------------------------------------------
create or replace function public.check_username_available(p_username text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  raw text := trim(coalesce(p_username, ''));
  core text := lower(regexp_replace(raw, '^@+', ''));
  taken boolean := false;
  suggestions text[] := array[]::text[];
  candidate text;
  i int;
begin
  if core = '' or length(core) < 2 then
    return jsonb_build_object(
      'available', false,
      'reason', 'too_short',
      'suggestions', '[]'::jsonb
    );
  end if;

  if core in ('dj', 'admin', 'deephouselab', 'deep house lab', 'removed', 'removed user') then
    return jsonb_build_object(
      'available', false,
      'reason', 'reserved',
      'suggestions', '[]'::jsonb
    );
  end if;

  select exists (
    select 1
    from public.profiles p
    where lower(trim(coalesce(p.username, ''))) = core
       or lower(regexp_replace(coalesce(p.handle, ''), '^@', '')) = core
  ) into taken;

  if not taken then
    return jsonb_build_object(
      'available', true,
      'reason', null,
      'suggestions', '[]'::jsonb
    );
  end if;

  for i in 1..12 loop
    candidate := case (i % 4)
      when 1 then core || (10 + (i * 7) % 89)::text
      when 2 then core || '_' || (10 + (i * 3) % 89)::text
      when 3 then 'dj_' || core
      else core || '_lab'
    end;
    candidate := lower(regexp_replace(candidate, '\s+', '', 'g'));
    if candidate = core then
      continue;
    end if;
    if not exists (
      select 1
      from public.profiles p
      where lower(trim(coalesce(p.username, ''))) = candidate
         or lower(regexp_replace(coalesce(p.handle, ''), '^@', '')) = candidate
    ) then
      suggestions := array_append(suggestions, candidate);
    end if;
    exit when coalesce(array_length(suggestions, 1), 0) >= 3;
  end loop;

  return jsonb_build_object(
    'available', false,
    'reason', 'taken',
    'suggestions', to_jsonb(suggestions)
  );
end;
$$;

revoke all on function public.check_username_available(text) from public;
grant execute on function public.check_username_available(text) to anon, authenticated;
