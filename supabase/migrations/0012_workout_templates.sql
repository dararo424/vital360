-- Vital360 — Migración 0012: plantillas/rutinas de entreno reutilizables
-- Corre esto en Supabase → SQL Editor. Idempotente.

create table if not exists public.workout_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.workout_template_items (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.workout_templates(id) on delete cascade,
  exercise_id uuid not null references public.exercises(id) on delete cascade,
  sets integer not null default 3,
  position integer not null default 0
);

alter table public.workout_templates enable row level security;
alter table public.workout_template_items enable row level security;

drop policy if exists "tpl own all" on public.workout_templates;
create policy "tpl own all" on public.workout_templates
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "tpl items own all" on public.workout_template_items;
create policy "tpl items own all" on public.workout_template_items
  for all to authenticated
  using (
    exists (select 1 from public.workout_templates t
            where t.id = template_id and t.user_id = auth.uid())
  )
  with check (
    exists (select 1 from public.workout_templates t
            where t.id = template_id and t.user_id = auth.uid())
  );
