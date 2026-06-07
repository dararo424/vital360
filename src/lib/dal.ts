import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { DailyMacros, NutritionGoal, Profile } from "@/lib/types";

/** Fecha de hoy en formato YYYY-MM-DD (zona del servidor). */
export function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Data Access Layer: centraliza la verificación de sesión y las lecturas de
 * datos del usuario. `cache()` memoiza durante un mismo render para no repetir
 * llamadas a Supabase.
 */

/** Devuelve el usuario verificado o null (no redirige). */
export const getUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

/** Exige sesión: redirige a /login si no hay usuario. */
export const requireUser = cache(async () => {
  const user = await getUser();
  if (!user) redirect("/login");
  return user;
});

/** Perfil del usuario actual (o null si aún no existe). */
export const getProfile = cache(async (): Promise<Profile | null> => {
  const user = await getUser();
  if (!user) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  return (data as Profile) ?? null;
});

/** Meta de nutrición vigente (effective_to IS NULL). */
export const getActiveGoal = cache(async (): Promise<NutritionGoal | null> => {
  const user = await getUser();
  if (!user) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from("nutrition_goals")
    .select("*")
    .eq("user_id", user.id)
    .is("effective_to", null)
    .order("effective_from", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (data as NutritionGoal) ?? null;
});

/**
 * Exige usuario con onboarding completo. Si falta perfil/meta, manda al wizard.
 * Úsalo en el layout del grupo (app).
 */
export const requireOnboarded = cache(async () => {
  const user = await requireUser();
  const [profile, goal] = await Promise.all([getProfile(), getActiveGoal()]);

  // No hay flag `onboarding_completed` en el schema: consideramos el onboarding
  // completo cuando hay perfil con datos básicos y una meta de nutrición vigente.
  if (!profile?.height_cm || !goal) {
    redirect("/onboarding");
  }

  return { user, profile, goal };
});

/** Consumo agregado de hoy (vista v_daily_macros), o null si no hay registros. */
export const getTodayMacros = cache(async (): Promise<DailyMacros | null> => {
  const user = await getUser();
  if (!user) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from("v_daily_macros")
    .select("*")
    .eq("user_id", user.id)
    .eq("log_date", today())
    .maybeSingle();

  return (data as DailyMacros) ?? null;
});

/** ¿El usuario completó el onboarding? (perfil con datos + meta vigente) */
export function isOnboarded(
  profile: { height_cm: number | null } | null,
  goal: unknown | null
): boolean {
  return Boolean(profile?.height_cm && goal);
}
