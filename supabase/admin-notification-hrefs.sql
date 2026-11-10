-- Point admin review notifications at the correct Admin Dashboard tab.
-- Re-run the notify functions from mix-submissions / floor-events-submissions /
-- user-approval after this, or apply the CREATE OR REPLACE blocks below via those files.
-- Safe to run on existing projects.

update public.notifications
set href = case
  when type = 'mix_submitted' and episode_id is not null
    then '/admin?tab=submissions&mix=' || episode_id::text
  when type = 'mix_submitted'
    then '/admin?tab=submissions'
  when type = 'floor_event_submitted'
    then '/admin?tab=floor'
  when type = 'new_user'
    then '/admin?tab=users'
  else href
end
where type in ('mix_submitted', 'floor_event_submitted', 'new_user')
  and (
    href is null
    or href = '/admin'
    or href not like '/admin?tab=%'
  );
