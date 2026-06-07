import { z } from "zod";

/**
 * Tipos y schemas compartidos.
 *
 * ⚠️ Los nombres de columna asumen el schema descrito en el Plan Maestro.
 * Si tu schema real difiere, ajusta SOLO este archivo (y las queries de dal.ts).
 */

// ── Enums ────────────────────────────────────────────────────────────────────

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

// ── Filas de DB ──────────────────────────────────────────────────────────────

export type Profile = {
  id: string; // = auth.users.id
  full_name: string | null;
  sex: Sex | null;
  birth_date: string | null; // ISO date (YYYY-MM-DD)
  height_cm: number | null;
  activity_level: ActivityLevel | null;
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
};

export type NutritionGoal = {
  id: string;
  user_id: string;
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  effective_from: string; // ISO date
  effective_to: string | null; // null = vigente
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
  kcal: z.coerce.number().int().min(800, "Muy bajo").max(8000, "Muy alto"),
  protein_g: z.coerce.number().min(0).max(1000),
  carbs_g: z.coerce.number().min(0).max(1500),
  fat_g: z.coerce.number().min(0).max(800),
});

export const onboardingSchema = profileStepSchema.merge(goalsStepSchema);

export type OnboardingInput = z.infer<typeof onboardingSchema>;

// ── Estado de Server Actions (para useActionState) ───────────────────────────

export type ActionState =
  | { ok: true }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> }
  | null;
