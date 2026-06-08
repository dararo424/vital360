-- Vital360 — Migración 0002: onboarding inteligente + plan estimado por IA
-- Corre esto en el SQL Editor de Supabase (proyecto rykswxeczamxanitlcpi).
--
-- Solo AGREGA columnas a `profiles`. No crea tablas nuevas, así que hereda
-- automáticamente las políticas RLS existentes (cada usuario ve/edita lo suyo).
-- Es idempotente: puedes correrlo más de una vez sin error.

alter table public.profiles
  -- Objetivo principal: lose_weight | recomp | define | gain_muscle | maintain | improve_habits
  add column if not exists objective text,
  -- Peso meta (kg). Opcional según el objetivo.
  add column if not exists target_weight_kg numeric,
  -- Intensidad del plan: suave | equilibrado | riguroso
  add column if not exists intensity text,
  -- true = el plan se recalcula cuando cambian tus datos; false = fijo
  add column if not exists adaptive boolean default true,
  -- Respuestas completas del cuestionario (estilo de vida, hábitos, antojos, etc.)
  add column if not exists onboarding jsonb,
  -- Plan generado por la IA (resumen, entreno, tips, recetas anti-antojo)
  add column if not exists plan jsonb,
  -- Marca de cuándo se generó/actualizó el plan
  add column if not exists plan_generated_at timestamptz;

-- Nota: las calorías y macros estimados siguen guardándose en nutrition_goals
-- (con vigencia effective_from/effective_to), así el histórico queda intacto
-- y el modo "adaptable" solo cierra la meta anterior y crea una nueva.
