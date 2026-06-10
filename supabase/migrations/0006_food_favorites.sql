-- Vital360 — Migración 0006: favoritos de alimentos
-- Corre esto en Supabase → SQL Editor. Idempotente.
-- Marca alimentos del catálogo propio como favoritos para acceso rápido.

alter table public.foods
  add column if not exists is_favorite boolean not null default false;
