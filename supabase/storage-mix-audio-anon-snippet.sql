-- Allow guests to obtain signed URLs for mix-audio so the web app can stream the file
-- while the client caps playback at 20 seconds. Run after mix-audio is private.
-- Note: technical users can still use the signed URL to fetch the full file; true DRM needs server-side streaming.

drop policy if exists "mix_audio_anon_select" on storage.objects;
create policy "mix_audio_anon_select" on storage.objects for select to anon
  using (bucket_id = 'mix-audio');
