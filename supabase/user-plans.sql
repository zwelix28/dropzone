-- Subscription tiers (Free / Paid / Pro) + protect plan from self-upgrade.
-- Run in SQL Editor on an existing project after base schema.

alter table public.profiles add column if not exists plan text not null default 'free';

update public.profiles
set plan = 'free'
where plan is null or plan not in ('free', 'paid', 'pro');

alter table public.profiles drop constraint if exists profiles_plan_check;
alter table public.profiles add constraint profiles_plan_check check (plan in ('free', 'paid', 'pro'));

create or replace function public.profiles_protect_privileged_columns()
returns trigger
language plpgsql
as $$
declare
  adm boolean;
begin
  if auth.uid() is null then
    return new;
  end if;
  if coalesce(current_setting('app.skip_profile_count_protect', true), '') = 'on' then
    return new;
  end if;
  select coalesce(is_admin, false) into adm from public.profiles where id = auth.uid();
  if not adm then
    new.is_admin := old.is_admin;
    new.is_banned := old.is_banned;
    new.verified := old.verified;
    new.plan := old.plan;
    new.followers_count := old.followers_count;
    new.following_count := old.following_count;
  end if;
  return new;
end;
$$;
