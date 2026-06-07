import { z } from "zod";

/**
 * Tipos y schemas compartidos.
 *
 * ✅ Nombres de columna VERIFICADOS contra el schema real de Supabase
 * (introspección vía PostgREST, junio 2026). No son asunciones.
 */

// ── Enums / catálogos ────────────────────────────────────────────────────────

export const SEXES = ["male", "female", "other"] as const;
export type Sex = (typeof SEXES)[number];

export const SEX_LABELS: Record<Sex, string> = {
  male: "Masculino",
  female: "Femenino",
  other: "Otro",
};

export const ACTIVITY_LEVELS = [
  "sedentary",
  "light",
  "moderate",
  "active",
  "very_active",
] as const;
export type ActivityLevel = (typeof ACTIVITY_LEVELS)[number];

export const ACTIVITY_LABELS: Record<ActivityLevel, string> = {
  sedentary: "Sedentario (poco o nada de ejercicio)",
  light: "Ligero (1-3 días/semana)",
  moderate: "Moderado (3-5 días/semana)",
  active: "Activo (6-7 días/semana)",
  very_active: "Muy activo (trabajo físico o doble sesión)",
};

export const MEAL_TYPES = ["desayuno", "almuerzo", "cena", "snack"] as const;
export type MealType = (typeof MEAL_TYPES)[number];

export const MEAL_TYPE_LABELS: Record<MealType, string> = {
  desayuno: "Desayuno",
  almuerzo: "Almuerzo",
  cena: "Cena",
  snack: "Snack",
};

// ── Filas de DB ──────────────────────────────────────────────────────────────

export type Profile = {
  id: string; // = auth.users.id
  full_name: string | null;
  sex: Sex | null;
  birth_date: string | null; // ISO date (YYYY-MM-DD)
  height_cm: number | null;
  activity_level: ActivityLevel | null;
  created_at: string;
  updated_at: string;
};

export type NutritionGoal = {
  id: string;
  user_id: string;
  kcal_target: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  effective_from: string; // ISO date
  effective_to: string | null; // null = vigente
  created_at: string;
};

/** Alimento del catálogo. user_id NULL = global (solo lectura). */
export type Food = {
  id: string;
  user_id: string | null;
  name: string;
  brand: string | null;
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  serving_g: number; // gramos de la porción de referencia a la que aplican los macros
  fiber_g: number | null;
  created_at: string;
};

export type FoodLog = {
  id: string;
  user_id: string;
  meal_type: MealType;
  log_date: string; // ISO date
  source: string; // "manual" | "photo" | ...
  photo_url: string | null;
  note: string | null;
  ai_raw: unknown | null;
  created_at: string;
};

export type FoodLogItem = {
  id: string;
  food_log_id: string;
  food_id: string | null;
  name: string;
  quantity_g: number;
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  ai_confidence: number | null;
  created_at: string;
};

/** Fila de la vista v_daily_macros (consumo agregado por día). */
export type DailyMacros = {
  user_id: string;
  log_date: string;
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
};

export type Macros = {
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
};

// ── Schemas de validación (zod) ──────────────────────────────────────────────

export const profileStepSchema = z.object({
  full_name: z.string().trim().min(1, "Tu nombre es requerido").max(80),
  sex: z.enum(SEXES, { message: "Selecciona una opción" }),
  birth_date: z
    .string()
    .min(1, "Fecha de nacimiento requerida")
    .refine((v) => !Number.isNaN(Date.parse(v)), "Fecha inválida"),
  height_cm: z.coerce
    .number()
    .int("Usa centímetros enteros")
    .min(80, "Muy bajo")
    .max(250, "Muy alto"),
  activity_level: z.enum(ACTIVITY_LEVELS, { message: "Selecciona una opción" }),
});

export const goalsStepSchema = z.object({
  // En el formulario se llama "kcal"; en DB es nutrition_goals.kcal_target.
  kcal: z.coerce.number().int().min(800, "Muy bajo").max(8000, "Muy alto"),
  protein_g: z.coerce.number().min(0).max(1000),
  carbs_g: z.coerce.number().min(0).max(1500),
  fat_g: z.coerce.number().min(0).max(800),
});

export const onboardingSchema = profileStepSchema.merge(goalsStepSchema);
export type OnboardingInput = z.infer<typeof onboardingSchema>;

/** Crear/editar un alimento del catálogo. Macros por `serving_g` gramos. */
export const foodSchema = z.object({
  name: z.string().trim().min(1, "Nombre requerido").max(120),
  brand: z.string().trim().max(120).optional().or(z.literal("")),
  serving_g: z.coerce.number().positive("Debe ser > 0").max(5000),
  kcal: z.coerce.number().min(0).max(10000),
  protein_g: z.coerce.number().min(0).max(1000),
  carbs_g: z.coerce.number().min(0).max(1000),
  fat_g: z.coerce.number().min(0).max(1000),
  fiber_g: z.coerce.number().min(0).max(1000).optional().or(z.literal("")),
});
export type FoodInput = z.infer<typeof foodSchema>;

/** Un ítem dentro del registro de comida manual. */
export const logItemSchema = z.object({
  food_id: z.string().uuid().nullable(),
  name: z.string().trim().min(1).max(120),
  quantity_g: z.coerce.number().positive().max(5000),
  kcal: z.coerce.number().min(0),
  protein_g: z.coerce.number().min(0),
  carbs_g: z.coerce.number().min(0),
  fat_g: z.coerce.number().min(0),
});

export const logMealSchema = z.object({
  meal_type: z.enum(MEAL_TYPES, { message: "Selecciona la comida" }),
  log_date: z
    .string()
    .min(1, "Fecha requerida")
    .refine((v) => !Number.isNaN(Date.parse(v)), "Fecha inválida"),
  note: z.string().trim().max(280).optional().or(z.literal("")),
  items: z.array(logItemSchema).min(1, "Agrega al menos un alimento"),
});
export type LogMealInput = z.infer<typeof logMealSchema>;

// ── Helpers de macros ────────────────────────────────────────────────────────

/** Escala los macros de un alimento (definidos por serving_g) a `grams`. */
export function scaleFood(food: Food, grams: number): Macros {
  const f = food.serving_g > 0 ? grams / food.serving_g : 0;
  return {
    kcal: Math.round(food.kcal * f),
    protein_g: round1(food.protein_g * f),
    carbs_g: round1(food.carbs_g * f),
    fat_g: round1(food.fat_g * f),
  };
}

export function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

// ── Estado de Server Actions (para useActionState) ───────────────────────────

export type ActionState =
  | { ok: true }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> }
  | null;
