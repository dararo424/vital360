-- Vital360 — Migración 0003: fotos IA de los platos
-- Corre esto en Supabase → SQL Editor. Idempotente.

-- 1. Columna para la URL de la foto en las recetas guardadas.
alter table public.recipes
  add column if not exists image_url text;

-- 2. Bucket de Storage público para las fotos de platos.
insert into storage.buckets (id, name, public)
values ('recipe-photos', 'recipe-photos', true)
on conflict (id) do nothing;

-- 3. Políticas RLS sobre storage.objects (cada usuario escribe en su carpeta;
--    lectura pública porque el bucket es público).
drop policy if exists "recipe-photos auth insert" on storage.objects;
create policy "recipe-photos auth insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'recipe-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "recipe-photos auth update" on storage.objects;
create policy "recipe-photos auth update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'recipe-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "recipe-photos public read" on storage.objects;
create policy "recipe-photos public read" on storage.objects
  for select to public
  using (bucket_id = 'recipe-photos');
