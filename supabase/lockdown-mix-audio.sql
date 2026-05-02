-- Apply after an older schema (public mix-audio). Run in Supabase SQL Editor.
-- 1) Adds path columns, 2) backfills paths from legacy public URLs, 3) makes mix-audio private,
-- 4) allows authenticated users to read mix-audio (for signed playback URLs),
-- 5) adds public mix-previews bucket for optional guest clips.

alter table public.mixes add column if not exists audio_storage_path text not null default '';
alter table public.mixes add column if not exists audio_preview_path text not null default '';

update public.mixes
set audio_storage_path = substring(
  regexp_replace(audio_url, '[?#].*$', '')
  from '/object/public/mix-audio/(.+)$'
)
where (audio_storage_path is null or audio_storage_path = '')
  and audio_url like '%/object/public/mix-audio/%';

update storage.buckets set public = false where id = 'mix-audio';

insert into storage.buckets (id, name, public)
values ('mix-previews', 'mix-previews', true)
on conflict (id) do nothing;

drop policy if exists "mix_audio_public_read" on storage.objects;
drop policy if exists "mix_audio_authenticated_select" on storage.objects;
create policy "mix_audio_authenticated_select" on storage.objects for select to authenticated
  using (bucket_id = 'mix-audio');

drop policy if exists "mix_audio_anon_select" on storage.objects;
create policy "mix_audio_anon_select" on storage.objects for select to anon
  using (bucket_id = 'mix-audio');

drop policy if exists "mix_previews_public_read" on storage.objects;
create policy "mix_previews_public_read" on storage.objects for select using (bucket_id = 'mix-previews');

drop policy if exists "mix_previews_auth_insert" on storage.objects;
create policy "mix_previews_auth_insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'mix-previews' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "mix_previews_auth_update" on storage.objects;
create policy "mix_previews_auth_update" on storage.objects for update to authenticated
  using (bucket_id = 'mix-previews' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "mix_previews_auth_delete" on storage.objects;
create policy "mix_previews_auth_delete" on storage.objects for delete to authenticated
  using (bucket_id = 'mix-previews' and (storage.foldername(name))[1] = auth.uid()::text);
