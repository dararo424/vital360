-- Vital360 — Migración 0007: seguimiento de agua / hidratación
-- Corre esto en Supabase → SQL Editor. Idempotente.

create table if not exists public.water_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  log_date date not null,
  ml integer not null default 0,
  created_at timestamptz not null default now(),
  unique (user_id, log_date)
);

alter table public.water_logs enable row level security;

drop policy if exists "water own select" on public.water_logs;
create policy "water own select" on public.water_logs
  for select to authenticated using (user_id = auth.uid());

drop policy if exists "water own insert" on public.water_logs;
create policy "water own insert" on public.water_logs
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists "water own update" on public.water_logs;
create policy "water own update" on public.water_logs
  for update to authenticated using (user_id = auth.uid());
