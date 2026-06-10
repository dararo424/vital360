-- Vital360 — Migración 0004: suscripciones de notificaciones push
-- Corre esto en Supabase → SQL Editor. Idempotente.

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

alter table public.push_subscriptions enable row level security;

-- Cada usuario administra solo sus propias suscripciones.
drop policy if exists "push own select" on public.push_subscriptions;
create policy "push own select" on public.push_subscriptions
  for select to authenticated using (user_id = auth.uid());

drop policy if exists "push own insert" on public.push_subscriptions;
create policy "push own insert" on public.push_subscriptions
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists "push own delete" on public.push_subscriptions;
create policy "push own delete" on public.push_subscriptions
  for delete to authenticated using (user_id = auth.uid());

-- El cron de recordatorios lee/borra con la service_role key (omite RLS).
