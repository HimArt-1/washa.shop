-- Create a bucket for artworks
insert into storage.buckets (id, name, public)
values ('artworks', 'artworks', true)
on conflict (id) do nothing;

-- Allow public access to view artworks
create policy "Public Access"
  on storage.objects for select
  using ( bucket_id = 'artworks' );

-- Allow authenticated users to upload artworks
create policy "Authenticated users can upload artworks"
  on storage.objects for insert
  with check (
    bucket_id = 'artworks' 
    and auth.role() = 'authenticated'
  );

-- Allow users to update/delete their own artworks
create policy "Users can update own artworks"
  on storage.objects for update
  using (
    bucket_id = 'artworks' 
    and auth.uid() = owner
  );

create policy "Users can delete own artworks"
  on storage.objects for delete
  using (
    bucket_id = 'artworks' 
    and auth.uid() = owner
  );
