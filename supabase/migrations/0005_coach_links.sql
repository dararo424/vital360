-- Vital360 — Migración 0005: vínculo nutricionista/coach ↔ cliente
-- Corre esto en Supabase → SQL Editor. Idempotente.
--
-- El cliente genera un código y se lo da a su nutri; la nutri lo redime y queda
-- vinculada. El acceso del coach a los datos del cliente se hace por server
-- actions verificadas (service_role), así que NO tocamos el RLS de las demás
-- tablas. Aquí solo aseguramos la tabla del vínculo.

create table if not exists public.coach_links (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references auth.users(id) on delete cascade,
  coach_id uuid references auth.users(id) on delete cascade,
  code text not null unique,
  status text not null default 'pending', -- pending | active
  client_name text,
  coach_name text,
  created_at timestamptz not null default now()
);

create index if not exists coach_links_coach_idx on public.coach_links (coach_id);
create index if not exists coach_links_client_idx on public.coach_links (client_id);

alter table public.coach_links enable row level security;

-- Ambas partes ven el vínculo.
drop policy if exists "coach_links select" on public.coach_links;
create policy "coach_links select" on public.coach_links
  for select to authenticated
  using (client_id = auth.uid() or coach_id = auth.uid());

-- El cliente crea su propio código de invitación.
drop policy if exists "coach_links insert" on public.coach_links;
create policy "coach_links insert" on public.coach_links
  for insert to authenticated
  with check (client_id = auth.uid());

-- Cualquiera de las dos partes puede desvincular.
drop policy if exists "coach_links delete" on public.coach_links;
create policy "coach_links delete" on public.coach_links
  for delete to authenticated
  using (client_id = auth.uid() or coach_id = auth.uid());

-- El redimir (asignar coach_id) lo hace el server con service_role.
