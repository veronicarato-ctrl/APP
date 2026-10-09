-- Travel Guide, private storage for tickets, QR codes and photos.
-- Files live under "<trip id>/<booking id>/<file>"; only members of that trip can read or write them.

insert into storage.buckets (id, name, public) values ('trip-files', 'trip-files', false)
  on conflict (id) do nothing;

drop policy if exists trip_files_read on storage.objects;
create policy trip_files_read on storage.objects for select to authenticated
  using (bucket_id = 'trip-files' and public.is_member(((storage.foldername(name))[1])::uuid));

drop policy if exists trip_files_insert on storage.objects;
create policy trip_files_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'trip-files' and public.is_member(((storage.foldername(name))[1])::uuid));

drop policy if exists trip_files_update on storage.objects;
create policy trip_files_update on storage.objects for update to authenticated
  using (bucket_id = 'trip-files' and public.is_member(((storage.foldername(name))[1])::uuid));

drop policy if exists trip_files_delete on storage.objects;
create policy trip_files_delete on storage.objects for delete to authenticated
  using (bucket_id = 'trip-files' and public.is_member(((storage.foldername(name))[1])::uuid));
