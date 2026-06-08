import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  computeRecipeMacros,
  type BodyMetric,
  type DailyMacros,
  type Macros,
  type NutritionGoal,
  type Profile,
  type Recipe,
} from "@/lib/types";

/** Receta con ingredientes (y su food) + macros calculados. */
export type RecipeWithMacros = Recipe & {
  ingredients: {
    id: string;
    name: string;
    quantity_g: number;
    food_id: string | null;
    food: {
      kcal: number;
      protein_g: number;
      carbs_g: number;
      fat_g: number;
      serving_g: number;
    } | null;
  }[];
  total: Macros;
  perServing: Macros;
};

const RECIPE_SELECT =
  "*,recipe_ingredients(id,name,quantity_g,food_id,foods(kcal,protein_g,carbs_g,fat_g,serving_g))";

/* eslint-disable @typescript-eslint/no-explicit-any */
function mapRecipe(row: any): RecipeWithMacros {
  const ingredients = (row.recipe_ingredients ?? []).map((ing: any) => ({
    id: ing.id,
    name: ing.name,
    quantity_g: ing.quantity_g,
    food_id: ing.food_id,
    food: ing.foods ?? null,
  }));
  const { total, perServing } = computeRecipeMacros(ingredients, row.servings);
  return { ...row, ingredients, total, perServing };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

/** Fecha de hoy en formato YYYY-MM-DD (zona del servidor). */
export function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Fecha hace `days` días en formato YYYY-MM-DD. */
export function daysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
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

/** Serie de consumo diario (v_daily_macros) de los últimos `days` días. */
export const getMacrosRange = cache(
  async (days: number): Promise<DailyMacros[]> => {
    const user = await getUser();
    if (!user) return [];

    const supabase = await createClient();
    const { data } = await supabase
      .from("v_daily_macros")
      .select("*")
      .eq("user_id", user.id)
      .gte("log_date", daysAgo(days))
      .order("log_date", { ascending: true });

    return (data as DailyMacros[]) ?? [];
  }
);

/** Mediciones corporales recientes (para tendencia de peso). */
export const getBodyMetrics = cache(
  async (limit = 60): Promise<BodyMetric[]> => {
    const user = await getUser();
    if (!user) return [];

    const supabase = await createClient();
    const { data } = await supabase
      .from("body_metrics")
      .select("*")
      .eq("user_id", user.id)
      .order("measured_at", { ascending: true })
      .limit(limit);

    return (data as BodyMetric[]) ?? [];
  }
);

/** Lista de recetas del usuario (con macros calculados). */
export const getRecipes = cache(async (): Promise<RecipeWithMacros[]> => {
  const user = await getUser();
  if (!user) return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from("recipes")
    .select(RECIPE_SELECT)
    .eq("user_id", user.id)
    .order("is_favorite", { ascending: false })
    .order("created_at", { ascending: false });

  return ((data as unknown[]) ?? []).map(mapRecipe);
});

/** Una receta por id (con ingredientes y macros), o null. */
export const getRecipe = cache(
  async (id: string): Promise<RecipeWithMacros | null> => {
    const user = await getUser();
    if (!user) return null;

    const supabase = await createClient();
    const { data } = await supabase
      .from("recipes")
      .select(RECIPE_SELECT)
      .eq("user_id", user.id)
      .eq("id", id)
      .maybeSingle();

    return data ? mapRecipe(data) : null;
  }
);

/** Macros restantes de hoy (meta vigente − consumido), para sugerencias IA. */
export async function getRemainingMacros(): Promise<Macros | null> {
  const [goal, todayM] = await Promise.all([getActiveGoal(), getTodayMacros()]);
  if (!goal) return null;
  return {
    kcal: Math.max(0, Math.round(goal.kcal_target - (todayM?.kcal ?? 0))),
    protein_g: Math.max(0, Math.round(goal.protein_g - (todayM?.protein_g ?? 0))),
    carbs_g: Math.max(0, Math.round(goal.carbs_g - (todayM?.carbs_g ?? 0))),
    fat_g: Math.max(0, Math.round(goal.fat_g - (todayM?.fat_g ?? 0))),
  };
}

/** ¿El usuario completó el onboarding? (perfil con datos + meta vigente) */
export function isOnboarded(
  profile: { height_cm: number | null } | null,
  goal: unknown | null
): boolean {
  return Boolean(profile?.height_cm && goal);
}
