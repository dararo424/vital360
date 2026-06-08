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

export type Recipe = {
  id: string;
  user_id: string;
  title: string;
  servings: number;
  tags: string[] | null;
  is_favorite: boolean;
  instructions: string | null;
  prep_minutes: number | null;
  created_at: string;
  updated_at: string;
};

export type RecipeIngredient = {
  id: string;
  recipe_id: string;
  food_id: string | null;
  name: string;
  quantity_g: number;
  created_at: string;
};

/** Tags sugeridos para recetas (texto libre además de estos). */
export const RECIPE_TAGS = [
  "alto_proteina",
  "bajo_carbo",
  "rapido",
  "post_entreno",
  "vegetariano",
  "economico",
  "meal_prep",
] as const;

export const RECIPE_TAG_LABELS: Record<string, string> = {
  alto_proteina: "Alto en proteína",
  bajo_carbo: "Bajo en carbos",
  rapido: "Rápido",
  post_entreno: "Post-entreno",
  vegetariano: "Vegetariano",
  economico: "Económico",
  meal_prep: "Meal prep",
};

export type MealPlan = {
  id: string;
  user_id: string;
  week_start: string; // ISO date (lunes)
  created_at: string;
};

export type MealPlanEntry = {
  id: string;
  meal_plan_id: string;
  entry_date: string; // ISO date
  meal_type: MealType;
  recipe_id: string | null;
  food_id: string | null;
  servings: number;
  created_at: string;
};

export type GroceryList = {
  id: string;
  user_id: string;
  meal_plan_id: string | null;
  title: string;
  created_at: string;
};

export type GroceryItem = {
  id: string;
  grocery_list_id: string;
  name: string;
  category: string | null;
  quantity: string | null; // texto, ej. "200 g"
  is_checked: boolean;
  created_at: string;
};

/** Categoriza un ingrediente por palabras clave (foods no tiene categoría). */
export function categorizeIngredient(name: string): string {
  const n = name.toLowerCase();
  const has = (...w: string[]) => w.some((x) => n.includes(x));
  if (has("pollo", "res", "carne", "cerdo", "pavo", "pescado", "atún", "salmón", "huevo", "jamón", "lomo", "tocino"))
    return "Carnes y huevos";
  if (has("leche", "queso", "yogur", "yogurt", "crema", "mantequilla"))
    return "Lácteos";
  if (has("manzana", "banano", "plátano", "fresa", "mango", "naranja", "uva", "pera", "piña", "fruta", "aguacate", "palta"))
    return "Frutas";
  if (has("lechuga", "tomate", "cebolla", "zanahoria", "brócoli", "espinaca", "pepino", "pimiento", "ajo", "papa", "verdura", "vegetal", "champiñón", "calabacín"))
    return "Verduras";
  if (has("arroz", "pasta", "pan", "avena", "quinoa", "harina", "tortilla", "cereal", "frijol", "lenteja", "garbanzo"))
    return "Granos y legumbres";
  if (has("aceite", "sal", "azúcar", "salsa", "vinagre", "especia", "condimento"))
    return "Despensa";
  return "Otros";
}

export const EXERCISE_TYPES = ["strength", "cardio"] as const;
export type ExerciseType = (typeof EXERCISE_TYPES)[number];
export const EXERCISE_TYPE_LABELS: Record<ExerciseType, string> = {
  strength: "Fuerza",
  cardio: "Cardio",
};

export type Exercise = {
  id: string;
  user_id: string | null; // null = global
  name: string;
  muscle_group: string | null;
  type: ExerciseType;
  created_at: string;
};

export type Workout = {
  id: string;
  user_id: string;
  title: string;
  workout_date: string; // ISO date
  duration_min: number | null;
  note: string | null;
  created_at: string;
};

export type WorkoutSet = {
  id: string;
  workout_id: string;
  exercise_id: string;
  set_number: number;
  reps: number | null;
  weight_kg: number | null;
  duration_sec: number | null;
  distance_m: number | null;
  rpe: number | null;
  created_at: string;
};

export type BodyMetric = {
  id: string;
  user_id: string;
  measured_at: string; // ISO date
  weight_kg: number | null;
  body_fat_pct: number | null;
  waist_cm: number | null;
  chest_cm: number | null;
  arm_cm: number | null;
  thigh_cm: number | null;
  note: string | null;
  created_at: string;
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

/** Un ítem dentro del registro de comida (manual o foto). */
export const logItemSchema = z.object({
  food_id: z.string().uuid().nullable(),
  name: z.string().trim().min(1).max(120),
  quantity_g: z.coerce.number().positive().max(5000),
  kcal: z.coerce.number().min(0),
  protein_g: z.coerce.number().min(0),
  carbs_g: z.coerce.number().min(0),
  fat_g: z.coerce.number().min(0),
  ai_confidence: z.coerce.number().min(0).max(1).nullable().optional(),
});

export const logMealSchema = z.object({
  meal_type: z.enum(MEAL_TYPES, { message: "Selecciona la comida" }),
  log_date: z
    .string()
    .min(1, "Fecha requerida")
    .refine((v) => !Number.isNaN(Date.parse(v)), "Fecha inválida"),
  note: z.string().trim().max(280).optional().or(z.literal("")),
  source: z.enum(["manual", "photo"]).default("manual"),
  ai_raw: z.unknown().optional(),
  items: z.array(logItemSchema).min(1, "Agrega al menos un alimento"),
});
export type LogMealInput = z.infer<typeof logMealSchema>;

/** Ítem estimado por Gemini Vision (foto → ítems editables). */
export const analyzedItemSchema = z.object({
  name: z.string().trim().min(1).max(120),
  estimated_grams: z.coerce.number().min(0).max(5000),
  kcal: z.coerce.number().min(0),
  protein_g: z.coerce.number().min(0),
  carbs_g: z.coerce.number().min(0),
  fat_g: z.coerce.number().min(0),
  confidence: z.coerce.number().min(0).max(1),
});
export const analyzeResultSchema = z.object({
  items: z.array(analyzedItemSchema),
});
export type AnalyzedItem = z.infer<typeof analyzedItemSchema>;

/** Crear/editar una receta. Los ingredientes ad-hoc (food_id null) se
 * convierten en foods al guardar (recipe_ingredients no almacena macros). */
export const recipeIngredientInputSchema = z.object({
  food_id: z.string().uuid().nullable(),
  name: z.string().trim().min(1, "Nombre requerido").max(120),
  quantity_g: z.coerce.number().positive().max(5000),
  kcal: z.coerce.number().min(0),
  protein_g: z.coerce.number().min(0),
  carbs_g: z.coerce.number().min(0),
  fat_g: z.coerce.number().min(0),
});

export const recipeSchema = z.object({
  title: z.string().trim().min(1, "Título requerido").max(120),
  servings: z.coerce.number().int().min(1, "Mínimo 1 porción").max(50),
  prep_minutes: z.coerce.number().int().min(0).max(1440).optional(),
  instructions: z.string().trim().max(4000).optional().or(z.literal("")),
  tags: z.array(z.string().trim().min(1).max(40)).max(12).default([]),
  ingredients: z
    .array(recipeIngredientInputSchema)
    .min(1, "Agrega al menos un ingrediente"),
});
export type RecipeInput = z.infer<typeof recipeSchema>;

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

/** Macros de una porción de comida concreta (food con serving_g + grams). */
type FoodMacroSource = Pick<
  Food,
  "kcal" | "protein_g" | "carbs_g" | "fat_g" | "serving_g"
>;

/** Suma macros de ingredientes y calcula total y por porción de una receta. */
export function computeRecipeMacros(
  ingredients: { quantity_g: number; food: FoodMacroSource | null }[],
  servings: number
): { total: Macros; perServing: Macros } {
  const total = ingredients.reduce<Macros>(
    (acc, ing) => {
      if (!ing.food) return acc;
      const m = scaleFood(ing.food as Food, ing.quantity_g);
      return {
        kcal: acc.kcal + m.kcal,
        protein_g: acc.protein_g + m.protein_g,
        carbs_g: acc.carbs_g + m.carbs_g,
        fat_g: acc.fat_g + m.fat_g,
      };
    },
    { kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0 }
  );
  const s = servings > 0 ? servings : 1;
  return {
    total,
    perServing: {
      kcal: Math.round(total.kcal / s),
      protein_g: round1(total.protein_g / s),
      carbs_g: round1(total.carbs_g / s),
      fat_g: round1(total.fat_g / s),
    },
  };
}

// ── Schemas de entrenos ──────────────────────────────────────────────────────

export const exerciseSchema = z.object({
  name: z.string().trim().min(1, "Nombre requerido").max(120),
  type: z.enum(EXERCISE_TYPES),
  muscle_group: z.string().trim().max(60).optional().or(z.literal("")),
});
export type ExerciseInput = z.infer<typeof exerciseSchema>;

export const workoutSetInputSchema = z.object({
  exercise_id: z.string().uuid(),
  set_number: z.coerce.number().int().min(1),
  reps: z.coerce.number().int().min(0).max(1000).nullable().optional(),
  weight_kg: z.coerce.number().min(0).max(1000).nullable().optional(),
  duration_sec: z.coerce.number().int().min(0).max(86400).nullable().optional(),
  distance_m: z.coerce.number().min(0).max(1000000).nullable().optional(),
  rpe: z.coerce.number().min(0).max(10).nullable().optional(),
});

export const workoutSchema = z.object({
  title: z.string().trim().min(1, "Título requerido").max(120),
  workout_date: z
    .string()
    .min(1, "Fecha requerida")
    .refine((v) => !Number.isNaN(Date.parse(v)), "Fecha inválida"),
  duration_min: z.coerce.number().int().min(0).max(1440).optional(),
  note: z.string().trim().max(280).optional().or(z.literal("")),
  sets: z.array(workoutSetInputSchema).min(1, "Agrega al menos una serie"),
});
export type WorkoutInput = z.infer<typeof workoutSchema>;

/** Ítem sugerido por la IA para una receta (se vuelve food al guardar). */
export const suggestedIngredientSchema = z.object({
  name: z.string().trim().min(1).max(120),
  quantity_g: z.coerce.number().min(0).max(5000),
  kcal: z.coerce.number().min(0),
  protein_g: z.coerce.number().min(0),
  carbs_g: z.coerce.number().min(0),
  fat_g: z.coerce.number().min(0),
});
export const suggestedRecipeSchema = z.object({
  title: z.string().trim().min(1).max(120),
  servings: z.coerce.number().int().min(1).max(50),
  prep_minutes: z.coerce.number().int().min(0).max(1440).optional(),
  instructions: z.string().trim().max(4000),
  tags: z.array(z.string()).max(12).default([]),
  ingredients: z.array(suggestedIngredientSchema).min(1),
});
export type SuggestedRecipe = z.infer<typeof suggestedRecipeSchema>;

export function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

// ── Estado de Server Actions (para useActionState) ───────────────────────────

export type ActionState =
  | { ok: true }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> }
  | null;
