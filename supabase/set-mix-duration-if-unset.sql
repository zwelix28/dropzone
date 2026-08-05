-- Allow any client to fill duration_secs when it is still unset (0).
-- Safe: only updates rows where duration is missing; cannot overwrite a real value.

create or replace function public.set_mix_duration_if_unset(p_mix_id uuid, p_duration_secs int)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_mix_id is null or p_duration_secs is null or p_duration_secs < 1 then
    return;
  end if;
  update public.mixes
  set duration_secs = p_duration_secs
  where id = p_mix_id
    and coalesce(duration_secs, 0) < 1;
end;
$$;

revoke all on function public.set_mix_duration_if_unset(uuid, int) from public;
grant execute on function public.set_mix_duration_if_unset(uuid, int) to anon, authenticated;
