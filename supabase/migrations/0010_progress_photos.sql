-- Vital360 — Migración 0010: fotos de progreso (antes/después)
-- Corre esto en Supabase → SQL Editor. Idempotente.
-- Bucket PRIVADO (fotos del cuerpo): solo el dueño puede verlas (URLs firmadas).

create table if not exists public.progress_photos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  image_path text not null,
  taken_on date not null,
  note text,
  created_at timestamptz not null default now()
);

alter table public.progress_photos enable row level security;

drop policy if exists "progress own select" on public.progress_photos;
create policy "progress own select" on public.progress_photos
  for select to authenticated using (user_id = auth.uid());

drop policy if exists "progress own insert" on public.progress_photos;
create policy "progress own insert" on public.progress_photos
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists "progress own delete" on public.progress_photos;
create policy "progress own delete" on public.progress_photos
  for delete to authenticated using (user_id = auth.uid());

-- Bucket privado.
insert into storage.buckets (id, name, public)
values ('progress-photos', 'progress-photos', false)
on conflict (id) do nothing;

-- Cada usuario sube/ve/borra solo en su carpeta.
drop policy if exists "progress-photos insert" on storage.objects;
create policy "progress-photos insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'progress-photos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "progress-photos select" on storage.objects;
create policy "progress-photos select" on storage.objects
  for select to authenticated
  using (bucket_id = 'progress-photos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "progress-photos delete" on storage.objects;
create policy "progress-photos delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'progress-photos' and (storage.foldername(name))[1] = auth.uid()::text);
