import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  computeRecipeMacros,
  type BodyMetric,
  type DailyMacros,
  type Food,
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

export type LoggedMeal = {
  id: string;
  meal_type: string;
  source: string;
  note: string | null;
  items: {
    id: string;
    name: string;
    quantity_g: number;
    kcal: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
  }[];
  totals: Macros;
};

/** Comidas registradas en una fecha (food_logs + sus items), por meal_type. */
export const getFoodLogs = cache(async (date: string): Promise<LoggedMeal[]> => {
  const user = await getUser();
  if (!user) return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from("food_logs")
    .select(
      "id,meal_type,source,note,created_at,food_log_items(id,name,quantity_g,kcal,protein_g,carbs_g,fat_g)"
    )
    .eq("user_id", user.id)
    .eq("log_date", date)
    .order("created_at", { ascending: true });

  /* eslint-disable @typescript-eslint/no-explicit-any */
  return ((data as any[]) ?? []).map((log) => {
    const items = (log.food_log_items ?? []).map((it: any) => ({
      id: it.id,
      name: it.name,
      quantity_g: it.quantity_g,
      kcal: it.kcal,
      protein_g: it.protein_g,
      carbs_g: it.carbs_g,
      fat_g: it.fat_g,
    }));
    const totals = items.reduce(
      (a: Macros, it: any) => ({
        kcal: a.kcal + (it.kcal ?? 0),
        protein_g: a.protein_g + (it.protein_g ?? 0),
        carbs_g: a.carbs_g + (it.carbs_g ?? 0),
        fat_g: a.fat_g + (it.fat_g ?? 0),
      }),
      { kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0 }
    );
    return {
      id: log.id,
      meal_type: log.meal_type,
      source: log.source,
      note: log.note,
      items,
      totals,
    };
  });
  /* eslint-enable @typescript-eslint/no-explicit-any */
});

/** Alimentos usados recientemente por el usuario (para acceso rápido). */
export const getRecentFoods = cache(async (limit = 8): Promise<Food[]> => {
  const user = await getUser();
  if (!user) return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from("food_logs")
    .select("created_at,food_log_items(food_id,foods(*))")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(40);

  /* eslint-disable @typescript-eslint/no-explicit-any */
  const seen = new Set<string>();
  const out: Food[] = [];
  for (const log of (data as any[]) ?? []) {
    for (const it of log.food_log_items ?? []) {
      const f = it.foods;
      if (f && !seen.has(f.id)) {
        seen.add(f.id);
        out.push(f as Food);
        if (out.length >= limit) return out;
      }
    }
  }
  /* eslint-enable @typescript-eslint/no-explicit-any */
  return out;
});

export type FoodLogFull = {
  id: string;
  meal_type: string;
  log_date: string;
  note: string | null;
  items: {
    food_id: string | null;
    name: string;
    quantity_g: number;
    kcal: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
    ai_confidence: number | null;
  }[];
};

/** Un registro de comida por id (para editar), o null. */
export const getFoodLog = cache(async (id: string): Promise<FoodLogFull | null> => {
  const user = await getUser();
  if (!user) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from("food_logs")
    .select(
      "id,meal_type,log_date,note,food_log_items(food_id,name,quantity_g,kcal,protein_g,carbs_g,fat_g,ai_confidence)"
    )
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  /* eslint-disable @typescript-eslint/no-explicit-any */
  if (!data) return null;
  const d = data as any;
  return {
    id: d.id,
    meal_type: d.meal_type,
    log_date: d.log_date,
    note: d.note,
    items: (d.food_log_items ?? []).map((it: any) => ({
      food_id: it.food_id,
      name: it.name,
      quantity_g: it.quantity_g,
      kcal: it.kcal,
      protein_g: it.protein_g,
      carbs_g: it.carbs_g,
      fat_g: it.fat_g,
      ai_confidence: it.ai_confidence,
    })),
  };
  /* eslint-enable @typescript-eslint/no-explicit-any */
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

// ── Entrenos ─────────────────────────────────────────────────────────────────

export type WorkoutWithSets = {
  id: string;
  title: string;
  workout_date: string;
  duration_min: number | null;
  note: string | null;
  sets: {
    id: string;
    exercise_id: string;
    set_number: number;
    reps: number | null;
    weight_kg: number | null;
    duration_sec: number | null;
    distance_m: number | null;
    rpe: number | null;
    exercise: { name: string; type: string; muscle_group: string | null } | null;
  }[];
};

export type ExerciseRecord = {
  name: string;
  type: string;
  maxWeight: number | null;
  maxVolume: number | null; // mejor reps×peso en una serie
};

/* eslint-disable @typescript-eslint/no-explicit-any */
function mapWorkout(w: any): WorkoutWithSets {
  return {
    id: w.id,
    title: w.title,
    workout_date: w.workout_date,
    duration_min: w.duration_min,
    note: w.note,
    sets: (w.workout_sets ?? [])
      .map((s: any) => ({
        id: s.id,
        exercise_id: s.exercise_id,
        set_number: s.set_number,
        reps: s.reps,
        weight_kg: s.weight_kg,
        duration_sec: s.duration_sec,
        distance_m: s.distance_m,
        rpe: s.rpe,
        exercise: s.exercises ?? null,
      }))
      .sort((a: any, b: any) => a.set_number - b.set_number),
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

/** Historial de entrenos del usuario (con sets y ejercicios). */
export const getWorkouts = cache(async (): Promise<WorkoutWithSets[]> => {
  const user = await getUser();
  if (!user) return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from("workouts")
    .select(
      "id,title,workout_date,duration_min,note,workout_sets(id,exercise_id,set_number,reps,weight_kg,duration_sec,distance_m,rpe,exercises(name,type,muscle_group))"
    )
    .eq("user_id", user.id)
    .order("workout_date", { ascending: false })
    .limit(100);

  return ((data as unknown[]) ?? []).map(mapWorkout);
});

/** Récords por ejercicio calculados desde el historial. */
export function computeRecords(workouts: WorkoutWithSets[]): ExerciseRecord[] {
  const map = new Map<string, ExerciseRecord>();
  for (const w of workouts) {
    for (const s of w.sets) {
      if (!s.exercise) continue;
      const key = s.exercise.name;
      const rec =
        map.get(key) ??
        { name: key, type: s.exercise.type, maxWeight: null, maxVolume: null };
      if (s.weight_kg != null) {
        rec.maxWeight = Math.max(rec.maxWeight ?? 0, s.weight_kg);
        if (s.reps != null) {
          rec.maxVolume = Math.max(rec.maxVolume ?? 0, s.weight_kg * s.reps);
        }
      }
      map.set(key, rec);
    }
  }
  return [...map.values()]
    .filter((r) => r.maxWeight != null)
    .sort((a, b) => (b.maxWeight ?? 0) - (a.maxWeight ?? 0));
}

// ── Planificador semanal ─────────────────────────────────────────────────────

/** Lunes (inicio de semana) de la fecha dada, en formato YYYY-MM-DD. */
export function mondayOf(dateIso?: string): string {
  const d = dateIso ? new Date(dateIso + "T00:00:00") : new Date();
  const day = (d.getDay() + 6) % 7; // 0 = lunes
  d.setDate(d.getDate() - day);
  return d.toISOString().slice(0, 10);
}

/** Los 7 días (ISO) de la semana que empieza en `weekStart`. */
export function weekDays(weekStart: string): string[] {
  const out: string[] = [];
  const d = new Date(weekStart + "T00:00:00");
  for (let i = 0; i < 7; i++) {
    out.push(d.toISOString().slice(0, 10));
    d.setDate(d.getDate() + 1);
  }
  return out;
}

export type PlanEntry = {
  id: string;
  entry_date: string;
  meal_type: string;
  servings: number;
  kind: "recipe" | "food";
  label: string;
  macros: Macros;
};

export type PlanWeek = {
  plan: { id: string; week_start: string } | null;
  entries: PlanEntry[];
};

const PLAN_SELECT =
  "id,week_start,meal_plan_entries(id,entry_date,meal_type,servings,recipe_id,food_id," +
  "recipes(id,title,servings,recipe_ingredients(quantity_g,foods(kcal,protein_g,carbs_g,fat_g,serving_g)))," +
  "foods(name,kcal,protein_g,carbs_g,fat_g,serving_g))";

/* eslint-disable @typescript-eslint/no-explicit-any */
function mapPlanEntry(e: any): PlanEntry {
  if (e.recipes) {
    const ings = (e.recipes.recipe_ingredients ?? []).map((ri: any) => ({
      quantity_g: ri.quantity_g,
      food: ri.foods ?? null,
    }));
    const { perServing } = computeRecipeMacros(ings, e.recipes.servings);
    return {
      id: e.id,
      entry_date: e.entry_date,
      meal_type: e.meal_type,
      servings: e.servings,
      kind: "recipe",
      label: e.recipes.title,
      macros: {
        kcal: Math.round(perServing.kcal * e.servings),
        protein_g: Math.round(perServing.protein_g * e.servings),
        carbs_g: Math.round(perServing.carbs_g * e.servings),
        fat_g: Math.round(perServing.fat_g * e.servings),
      },
    };
  }
  const f = e.foods;
  return {
    id: e.id,
    entry_date: e.entry_date,
    meal_type: e.meal_type,
    servings: e.servings,
    kind: "food",
    label: f?.name ?? "Alimento",
    macros: f
      ? {
          kcal: Math.round(f.kcal * e.servings),
          protein_g: Math.round(f.protein_g * e.servings),
          carbs_g: Math.round(f.carbs_g * e.servings),
          fat_g: Math.round(f.fat_g * e.servings),
        }
      : { kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0 },
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

/** Plan de la semana (con entries y macros), o plan null si no existe. */
export const getPlanWeek = cache(
  async (weekStart: string): Promise<PlanWeek> => {
    const user = await getUser();
    if (!user) return { plan: null, entries: [] };

    const supabase = await createClient();
    const { data } = await supabase
      .from("meal_plans")
      .select(PLAN_SELECT)
      .eq("user_id", user.id)
      .eq("week_start", weekStart)
      .maybeSingle();

    if (!data) return { plan: null, entries: [] };
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
    const d = data as any;
    return {
      plan: { id: d.id, week_start: d.week_start },
      entries: (d.meal_plan_entries ?? []).map(mapPlanEntry),
    };
  }
);

/** Lista de mercado más reciente del usuario (con items). */
export const getLatestGroceryList = cache(async () => {
  const user = await getUser();
  if (!user) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from("grocery_lists")
    .select("id,title,created_at,grocery_items(id,name,category,quantity,is_checked)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return data ?? null;
});

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
