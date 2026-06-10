-- Vital360 — Migración 0011: fibra por ítem de comida
-- Corre esto en Supabase → SQL Editor. Idempotente.

alter table public.food_log_items
  add column if not exists fiber_g numeric;
