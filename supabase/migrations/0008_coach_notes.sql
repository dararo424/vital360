-- Vital360 — Migración 0008: notas/mensajes coach ↔ cliente
-- Corre esto en Supabase → SQL Editor. Idempotente.

create table if not exists public.coach_notes (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid not null references auth.users(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists coach_notes_pair_idx
  on public.coach_notes (coach_id, client_id, created_at);

alter table public.coach_notes enable row level security;

-- Coach y cliente del par ven el hilo.
drop policy if exists "coach_notes select" on public.coach_notes;
create policy "coach_notes select" on public.coach_notes
  for select to authenticated
  using (auth.uid() = coach_id or auth.uid() = client_id);

-- Cualquiera de los dos puede escribir (el autor debe ser uno de ellos).
drop policy if exists "coach_notes insert" on public.coach_notes;
create policy "coach_notes insert" on public.coach_notes
  for insert to authenticated
  with check (
    author_id = auth.uid() and (auth.uid() = coach_id or auth.uid() = client_id)
  );
