-- Vital360 — Migración 0013: grupos/familia (rachas compartidas)
-- Corre esto en Supabase → SQL Editor. Idempotente.
-- Lectura entre miembros se hace con service_role en server actions verificadas
-- (igual que el coach), por eso el RLS aquí es mínimo (solo lo propio).

create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_id uuid not null references auth.users(id) on delete cascade,
  code text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.group_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  unique (group_id, user_id)
);

alter table public.groups enable row level security;
alter table public.group_members enable row level security;

-- groups: el dueño administra; los miembros lo leen.
drop policy if exists "groups owner" on public.groups;
create policy "groups owner" on public.groups
  for all to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop policy if exists "groups member read" on public.groups;
create policy "groups member read" on public.groups
  for select to authenticated
  using (exists (select 1 from public.group_members m
                 where m.group_id = groups.id and m.user_id = auth.uid()));

-- group_members: cada quien administra SOLO su propia membresía (evita recursión).
drop policy if exists "gm own" on public.group_members;
create policy "gm own" on public.group_members
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
