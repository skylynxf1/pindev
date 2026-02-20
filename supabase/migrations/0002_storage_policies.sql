-- ============================================================
-- PinDev · 0002_storage_policies.sql
-- ============================================================
-- Creates the pin-media bucket and adds storage RLS policies.
-- Upload paths are: {user_id}/{timestamp}-{random}.{ext}
-- ============================================================

-- Create the bucket if it doesn't exist yet
insert into storage.buckets (id, name, public)
values ('pin-media', 'pin-media', true)
on conflict (id) do nothing;

-- ── STORAGE RLS POLICIES ──────────────────────────────────────

-- Authenticated users can upload files into their own folder.
-- Path format: {user_id}/...
create policy "pin-media: owner insert"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'pin-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Anyone can read files from the bucket (it's public).
create policy "pin-media: public read"
  on storage.objects for select
  using (bucket_id = 'pin-media');

-- Owners can delete their own files.
create policy "pin-media: owner delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'pin-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
