/**
 * Motor de cálculo del plan nutricional (determinista).
 *
 * Calorías por fórmula médica Mifflin-St Jeor + factor de actividad + ajuste
 * por objetivo e intensidad, con topes de seguridad. La IA personaliza y crea
 * el plan/recetas DESPUÉS, partiendo de estos números fiables.
 *
 * Principio Vital360: es un ESTIMADO de apoyo, editable, no una prescripción
 * médica. Nunca proponemos déficits extremos.
 */

import { z } from "zod";
import {
  ACTIVITY_LEVELS,
  ACTIVITY_LABELS,
  SEXES,
  type ActivityLevel,
  type Sex,
} from "@/lib/types";

// ── Salvaguardas de seguridad (TCA) ─────────────────────────────────────────

export type SafetyWarning = { level: "warn" | "info"; message: string };

/**
 * Detecta metas potencialmente dañinas (peso bajo, calorías al mínimo, pérdida
 * muy grande) para mostrar mensajes de APOYO, sin bloquear. Principio Vital360:
 * cuidar el bienestar, no empujar extremos.
 */
export function assessGoalSafety(input: {
  sex?: string | null;
  heightCm?: number | null;
  currentWeightKg?: number | null;
  targetWeightKg?: number | null;
  kcalTarget?: number | null;
}): SafetyWarning[] {
  const { sex, heightCm, currentWeightKg, targetWeightKg, kcalTarget } = input;
  const warns: SafetyWarning[] = [];

  if (heightCm && targetWeightKg) {
    const m = heightCm / 100;
    const bmi = targetWeightKg / (m * m);
    if (bmi < 18.5) {
      warns.push({
        level: "warn",
        message:
          "Tu peso meta queda por debajo de un rango saludable (IMC < 18,5). Considera una meta más alta y consúltalo con un profesional de la salud.",
      });
    }
  }

  const floor = sex === "F" ? 1200 : 1500;
  if (kcalTarget != null && kcalTarget <= floor) {
    warns.push({
      level: "warn",
      message: `Tu meta de calorías está en el mínimo recomendado (${floor} kcal). No bajes de ahí sin supervisión profesional.`,
    });
  }

  if (currentWeightKg && targetWeightKg && currentWeightKg > targetWeightKg) {
    const pct = (currentWeightKg - targetWeightKg) / currentWeightKg;
    if (pct > 0.25) {
      warns.push({
        level: "info",
        message:
          "Tu meta implica una pérdida grande. Es más sano y sostenible ir por etapas; la app no aplica déficits agresivos.",
      });
    }
  }

  return warns;
}

// ── Catálogos ────────────────────────────────────────────────────────────────

export const OBJECTIVES = [
  "lose_weight",
  "recomp",
  "define",
  "gain_muscle",
  "maintain",
  "improve_habits",
] as const;
export type Objective = (typeof OBJECTIVES)[number];

export const OBJECTIVE_LABELS: Record<Objective, string> = {
  lose_weight: "Bajar de peso",
  recomp: "Bajar de peso y tonificar",
  define: "Definir / marcar",
  gain_muscle: "Ganar músculo",
  maintain: "Mantener peso y forma",
  improve_habits: "Mejorar hábitos alimenticios",
};

export const OBJECTIVE_HINTS: Record<Objective, string> = {
  lose_weight: "Déficit calórico para perder grasa de forma sostenible.",
  recomp:
    "Pierdes grasa mientras cuidas y construyes músculo: pérdida gradual + mucha proteína + fuerza.",
  define: "Bajar grasa manteniendo el músculo, cerca de tu peso actual.",
  gain_muscle: "Pequeño superávit y entrenamiento de fuerza para ganar músculo.",
  maintain: "Mantener tu peso y condición física actual.",
  improve_habits: "Comer mejor sin obsesionarte con el déficit.",
};

export const INTENSITIES = ["suave", "equilibrado", "riguroso"] as const;
export type Intensity = (typeof INTENSITIES)[number];

export const INTENSITY_LABELS: Record<Intensity, string> = {
  suave: "Suave",
  equilibrado: "Equilibrado",
  riguroso: "Riguroso",
};

export const INTENSITY_HINTS: Record<Intensity, string> = {
  suave: "Cambios pequeños y muy llevaderos. Ideal para empezar sin presión.",
  equilibrado: "Buen ritmo, sostenible. La opción recomendada para la mayoría.",
  riguroso: "Ritmo más exigente (siempre dentro de lo seguro). Requiere constancia.",
};

const ACTIVITY_FACTORS: Record<ActivityLevel, number> = {
  sedentario: 1.2,
  ligero: 1.375,
  moderado: 1.55,
  activo: 1.725,
  muy_activo: 1.9,
};

// % de déficit (negativo) o superávit (positivo) por objetivo × intensidad.
const ADJUST: Record<Objective, Record<Intensity, number>> = {
  lose_weight: { suave: -0.12, equilibrado: -0.18, riguroso: -0.23 },
  recomp: { suave: -0.1, equilibrado: -0.15, riguroso: -0.2 },
  define: { suave: -0.08, equilibrado: -0.12, riguroso: -0.18 },
  gain_muscle: { suave: 0.05, equilibrado: 0.08, riguroso: 0.12 },
  maintain: { suave: 0, equilibrado: 0, riguroso: 0 },
  improve_habits: { suave: -0.05, equilibrado: -0.05, riguroso: -0.05 },
};

// Proteína (g por kg de peso base) por objetivo.
const PROTEIN_PER_KG: Record<Objective, number> = {
  lose_weight: 2.0,
  recomp: 2.1,
  define: 2.1,
  gain_muscle: 1.9,
  maintain: 1.6,
  improve_habits: 1.6,
};

const KCAL_PER_KG_FAT = 7700; // energía aprox. en 1 kg de grasa corporal

// ── Cálculo ──────────────────────────────────────────────────────────────────

export type PlanInput = {
  sex: Sex;
  age: number;
  height_cm: number;
  weight_kg: number;
  activity_level: ActivityLevel;
  objective: Objective;
  intensity: Intensity;
  target_weight_kg?: number | null;
};

export type PlanEstimate = {
  bmr: number;
  tdee: number;
  daily_kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  daily_delta: number; // déficit (negativo) o superávit (positivo) kcal/día
  weekly_rate_kg: number; // ritmo estimado de cambio de peso por semana
  weeks_to_target: number | null;
  warnings: string[];
};

export function ageFromBirthDate(birthDate: string, today = new Date()): number {
  const b = new Date(birthDate + "T00:00:00");
  let age = today.getFullYear() - b.getFullYear();
  const m = today.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < b.getDate())) age--;
  return age;
}

export function computePlan(input: PlanInput): PlanEstimate {
  const warnings: string[] = [];

  // 1. BMR (Mifflin-St Jeor)
  const base =
    10 * input.weight_kg + 6.25 * input.height_cm - 5 * input.age;
  const bmr = Math.round(base + (input.sex === "F" ? -161 : 5));

  // 2. TDEE (mantenimiento)
  const tdee = Math.round(bmr * ACTIVITY_FACTORS[input.activity_level]);

  // 3. Ajuste por objetivo × intensidad
  const pct = ADJUST[input.objective][input.intensity];
  let daily = Math.round(tdee * (1 + pct));

  // 4. Topes de seguridad
  const floor = input.sex === "F" ? 1200 : 1500;
  if (daily < floor) {
    daily = floor;
    warnings.push(
      `Ajustamos las calorías al mínimo seguro (${floor} kcal). No bajamos de ahí.`
    );
  }

  // 5. Peso base para macros (si baja de peso y hay meta, usamos la meta)
  const losing = pct < 0 && input.target_weight_kg;
  const basisWeight =
    losing && input.target_weight_kg ? input.target_weight_kg : input.weight_kg;

  // 6. Macros
  const protein_g = Math.round(PROTEIN_PER_KG[input.objective] * basisWeight);
  let fat_g = Math.round(0.8 * basisWeight);
  // La grasa no debe bajar de ~20% de las calorías.
  const minFat = Math.round((daily * 0.2) / 9);
  if (fat_g < minFat) fat_g = minFat;
  const proteinKcal = protein_g * 4;
  const fatKcal = fat_g * 9;
  let carbs_g = Math.round((daily - proteinKcal - fatKcal) / 4);
  if (carbs_g < 0) carbs_g = 0;

  // 7. Ritmo y tiempo estimado
  const daily_delta = daily - tdee;
  const weekly_rate_kg =
    Math.round(((daily_delta * 7) / KCAL_PER_KG_FAT) * 100) / 100;

  let weeks_to_target: number | null = null;
  if (input.target_weight_kg && weekly_rate_kg !== 0) {
    const diff = input.target_weight_kg - input.weight_kg;
    // El signo del cambio debe ir acorde al objetivo (perder vs ganar)
    if (Math.sign(diff) === Math.sign(weekly_rate_kg)) {
      weeks_to_target = Math.ceil(Math.abs(diff) / Math.abs(weekly_rate_kg));
    }
  }

  // 8. Aviso de ritmo (>1% del peso por semana es agresivo)
  if (Math.abs(weekly_rate_kg) > input.weight_kg * 0.01) {
    warnings.push(
      "Este ritmo es exigente; considera una intensidad menor para que sea más sostenible."
    );
  }

  return {
    bmr,
    tdee,
    daily_kcal: daily,
    protein_g,
    carbs_g,
    fat_g,
    daily_delta,
    weekly_rate_kg,
    weeks_to_target,
    warnings,
  };
}

/** Recomienda un objetivo a partir del IMC (la app sugiere, el usuario decide). */
export function recommendObjective(height_cm: number, weight_kg: number): Objective {
  const bmi = weight_kg / Math.pow(height_cm / 100, 2);
  if (bmi >= 30) return "lose_weight";
  if (bmi >= 25) return "recomp";
  if (bmi < 20) return "gain_muscle";
  return "define";
}

// ── Catálogos del cuestionario ───────────────────────────────────────────────

export const WORK_TYPES = {
  sentado: "Trabajo sentado / oficina",
  mixto: "Mixto (me muevo a ratos)",
  de_pie: "De pie casi todo el día",
  fisico: "Trabajo físico / pesado",
} as const;

export const PLACES = {
  casa: "En casa",
  gimnasio: "Gimnasio",
  ambos: "Casa y gimnasio",
  ninguno: "Por ahora no entreno",
} as const;

export const CRAVINGS = {
  frituras: "Frituras",
  comida_rapida: "Comida rápida / chatarra",
  dulces: "Dulces y postres",
  gaseosas: "Gaseosas / bebidas azucaradas",
  pan_harinas: "Pan y harinas",
  snacks_salados: "Snacks salados (papas, etc.)",
  alcohol: "Alcohol",
} as const;

export const FAIL_MEALS = {
  desayuno: "Desayuno",
  almuerzo: "Almuerzo",
  cena: "Cena",
  snacks_dia: "Picar entre comidas",
  noche: "Antojos de noche",
  finde: "Fines de semana",
} as const;

export const EATS_OUT = {
  rara_vez: "Rara vez",
  semanal: "1–2 veces/semana",
  frecuente: "3–5 veces/semana",
  diario: "Casi a diario",
} as const;

export const COOK_TIME = {
  poco: "Poco (rápido y simple)",
  medio: "Algo (15–30 min)",
  bastante: "Me gusta cocinar",
} as const;

export const BUDGET = {
  ajustado: "Ajustado",
  medio: "Medio",
  holgado: "Holgado",
} as const;

// ── Schema del onboarding inteligente ────────────────────────────────────────

export const smartOnboardingSchema = z.object({
  // Perfil base
  full_name: z.string().trim().min(1, "Tu nombre es requerido").max(80),
  sex: z.enum(SEXES, { message: "Selecciona una opción" }),
  birth_date: z
    .string()
    .min(1, "Fecha de nacimiento requerida")
    .refine((v) => !Number.isNaN(Date.parse(v)), "Fecha inválida"),
  height_cm: z.coerce.number().int().min(80).max(250),
  weight_kg: z.coerce.number().min(25).max(400),
  activity_level: z.enum(ACTIVITY_LEVELS, { message: "Selecciona una opción" }),
  // Objetivo
  objective: z.enum(OBJECTIVES, { message: "Selecciona un objetivo" }),
  target_weight_kg: z.coerce.number().min(25).max(400).optional().or(z.literal("")),
  intensity: z.enum(INTENSITIES, { message: "Selecciona la intensidad" }),
  adaptive: z.boolean().default(true),
  // Cuestionario (se guarda en profiles.onboarding jsonb)
  questionnaire: z
    .object({
      work_type: z.string().optional(),
      place: z.string().optional(),
      training_days: z.coerce.number().int().min(0).max(7).optional(),
      sleep_hours: z.coerce.number().min(0).max(16).optional().or(z.literal("")),
      meals_per_day: z.coerce.number().int().min(1).max(10).optional().or(z.literal("")),
      fail_meal: z.array(z.string()).default([]),
      cravings: z.array(z.string()).default([]),
      eats_out: z.string().optional(),
      allergies: z.string().trim().max(300).optional(),
      dislikes: z.string().trim().max(300).optional(),
      cook_time: z.string().optional(),
      budget: z.string().optional(),
    })
    .optional(),
});
export type SmartOnboardingInput = z.input<typeof smartOnboardingSchema>;

/** Arma el texto de perfil que se le pasa a la IA para generar el plan. */
export function buildPlanBrief(
  data: z.infer<typeof smartOnboardingSchema>,
  est: PlanEstimate
): string {
  const q = (data.questionnaire ?? {}) as NonNullable<typeof data.questionnaire>;
  const lbl = (map: Record<string, string>, k?: string) => (k ? map[k] ?? k : "—");
  const list = (map: Record<string, string>, arr?: string[]) =>
    arr && arr.length ? arr.map((x) => map[x] ?? x).join(", ") : "ninguno";
  return `Perfil del usuario:
- ${data.sex === "F" ? "Mujer" : data.sex === "M" ? "Hombre" : "Persona"}, nacida ${data.birth_date}, ${data.height_cm} cm, ${data.weight_kg} kg.
- Actividad diaria: ${ACTIVITY_LABELS[data.activity_level]}. Trabajo: ${lbl(WORK_TYPES, q.work_type)}.
- Objetivo: ${OBJECTIVE_LABELS[data.objective]} (${OBJECTIVE_HINTS[data.objective]})${data.target_weight_kg ? `. Meta de peso: ${data.target_weight_kg} kg` : ""}.
- Intensidad elegida: ${INTENSITY_LABELS[data.intensity]}. Entrena en: ${lbl(PLACES, q.place)}, ${q.training_days ?? "?"} días/semana disponibles. Sueño: ${q.sleep_hours || "?"} h.
- Calorías objetivo (ya calculadas por fórmula, NO las cambies): ${est.daily_kcal} kcal/día. Macros: proteína ${est.protein_g} g, carbohidratos ${est.carbs_g} g, grasa ${est.fat_g} g.
- Hábitos: ${q.meals_per_day || "?"} comidas/día. Donde más falla: ${list(FAIL_MEALS, q.fail_meal)}. Come fuera: ${lbl(EATS_OUT, q.eats_out)}.
- Antojos principales: ${list(CRAVINGS, q.cravings)}.
- Tiempo para cocinar: ${lbl(COOK_TIME, q.cook_time)}. Presupuesto: ${lbl(BUDGET, q.budget)}.
- Alergias/intolerancias: ${q.allergies || "ninguna"}. No le gusta: ${q.dislikes || "—"}.`;
}

// ── Plan generado por IA ─────────────────────────────────────────────────────

export const generatedRecipeSchema = z.object({
  title: z.string(),
  servings: z.coerce.number().int().min(1).max(50),
  kcal_per_serving: z.coerce.number().min(0),
  protein_g: z.coerce.number().min(0),
  carbs_g: z.coerce.number().min(0),
  fat_g: z.coerce.number().min(0),
  ingredients: z
    .array(
      z.object({
        name: z.string(),
        quantity_g: z.coerce.number().min(0),
        kcal: z.coerce.number().min(0),
        protein_g: z.coerce.number().min(0),
        carbs_g: z.coerce.number().min(0),
        fat_g: z.coerce.number().min(0),
      })
    )
    .min(1),
  steps: z.array(z.string()).min(1),
  video_search: z.string().optional().default(""),
});

export const generatedPlanSchema = z.object({
  summary: z.string(),
  training: z.object({
    days_per_week: z.coerce.number().int().min(0).max(7),
    focus: z.string(),
    sessions: z
      .array(
        z.object({
          name: z.string(),
          focus: z.string(),
          exercises: z.array(z.string()),
        })
      )
      .default([]),
  }),
  habit_tips: z.array(z.string()).default([]),
  craving_busters: z
    .array(z.object({ craving: z.string(), swap: z.string() }))
    .default([]),
  recipes: z.array(generatedRecipeSchema).default([]),
});
export type GeneratedPlan = z.infer<typeof generatedPlanSchema>;
