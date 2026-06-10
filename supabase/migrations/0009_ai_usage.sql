-- Vital360 — Migración 0009: contador de uso de IA (rate-limiting por usuario)
-- Corre esto en Supabase → SQL Editor. Idempotente.

create table if not exists public.ai_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null,
  kind text not null,
  count integer not null default 0,
  unique (user_id, day, kind)
);

alter table public.ai_usage enable row level security;

drop policy if exists "ai_usage own select" on public.ai_usage;
create policy "ai_usage own select" on public.ai_usage
  for select to authenticated using (user_id = auth.uid());

drop policy if exists "ai_usage own insert" on public.ai_usage;
create policy "ai_usage own insert" on public.ai_usage
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists "ai_usage own update" on public.ai_usage;
create policy "ai_usage own update" on public.ai_usage
  for update to authenticated using (user_id = auth.uid());
