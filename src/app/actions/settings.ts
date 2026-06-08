"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getUser, today } from "@/lib/dal";
import {
  ageFromBirthDate,
  computePlan,
  INTENSITIES,
  OBJECTIVES,
} from "@/lib/nutrition-plan";
import { ACTIVITY_LEVELS, SEXES, type ActionState } from "@/lib/types";

/* eslint-disable @typescript-eslint/no-explicit-any */

async function latestWeight(supabase: any, userId: string): Promise<number | null> {
  const { data } = await supabase
    .from("body_metrics")
    .select("weight_kg")
    .eq("user_id", userId)
    .not("weight_kg", "is", null)
    .order("measured_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data?.weight_kg ?? null;
}

const profileGoalSchema = z.object({
  full_name: z.string().trim().min(1, "Tu nombre es requerido").max(80),
  sex: z.enum(SEXES),
  birth_date: z
    .string()
    .min(1, "Fecha requerida")
    .refine((v) => !Number.isNaN(Date.parse(v)), "Fecha inválida"),
  height_cm: z.coerce.number().int().min(80).max(250),
  activity_level: z.enum(ACTIVITY_LEVELS),
  objective: z.enum(OBJECTIVES),
  target_weight_kg: z.coerce.number().min(25).max(400).optional().or(z.literal("")),
  intensity: z.enum(INTENSITIES),
  adaptive: z.boolean(),
});
export type ProfileGoalInput = z.input<typeof profileGoalSchema>;

/**
 * Guarda perfil + objetivo/intensidad y recalcula la meta de calorías con la
 * fórmula (usando tu peso más reciente). Cierra la meta vigente y crea una nueva.
 */
export async function updateProfileAndGoal(
  input: ProfileGoalInput
): Promise<ActionState> {
  const user = await getUser();
  if (!user) return { ok: false, error: "Sesión expirada." };

  const parsed = profileGoalSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues
        .map((i) => `${i.path.join(".") || "?"}: ${i.message}`)
        .join(" · "),
    };
  }
  const d = parsed.data;
  const supabase = await createClient();

  const target =
    d.target_weight_kg === "" || d.target_weight_kg === undefined
      ? null
      : d.target_weight_kg;

  const { error: pErr } = await supabase
    .from("profiles")
    .update({
      full_name: d.full_name,
      sex: d.sex,
      birth_date: d.birth_date,
      height_cm: d.height_cm,
      activity_level: d.activity_level,
      objective: d.objective,
      target_weight_kg: target,
      intensity: d.intensity,
      adaptive: d.adaptive,
    })
    .eq("id", user.id);
  if (pErr) return { ok: false, error: "No se pudo guardar el perfil." };

  const weight = await latestWeight(supabase, user.id);
  if (!weight) {
    return {
      ok: false,
      error: "Perfil guardado, pero registra tu peso en Progreso para recalcular la meta.",
    };
  }

  const est = computePlan({
    sex: d.sex,
    age: ageFromBirthDate(d.birth_date),
    height_cm: d.height_cm,
    weight_kg: weight,
    activity_level: d.activity_level,
    objective: d.objective,
    intensity: d.intensity,
    target_weight_kg: target,
  });

  const date = today();
  await supabase
    .from("nutrition_goals")
    .update({ effective_to: date })
    .eq("user_id", user.id)
    .is("effective_to", null);
  const { error: gErr } = await supabase.from("nutrition_goals").insert({
    user_id: user.id,
    kcal_target: est.daily_kcal,
    protein_g: est.protein_g,
    carbs_g: est.carbs_g,
    fat_g: est.fat_g,
    effective_from: date,
    effective_to: null,
  });
  if (gErr) return { ok: false, error: "No se pudo actualizar la meta." };

  // Mantén el estimado del plan en sincronía.
  const { data: prof } = await supabase
    .from("profiles")
    .select("plan")
    .eq("id", user.id)
    .maybeSingle();
  if (prof?.plan) {
    await supabase
      .from("profiles")
      .update({ plan: { ...prof.plan, estimate: est } })
      .eq("id", user.id);
  }

  revalidatePath("/ajustes");
  revalidatePath("/dashboard");
  revalidatePath("/mi-plan");
  return { ok: true };
}

const manualGoalSchema = z.object({
  kcal_target: z.coerce.number().int().min(800, "Muy bajo").max(8000, "Muy alto"),
  protein_g: z.coerce.number().min(0).max(1000),
  carbs_g: z.coerce.number().min(0).max(1500),
  fat_g: z.coerce.number().min(0).max(800),
});
export type ManualGoalInput = z.input<typeof manualGoalSchema>;

/**
 * Fija metas manuales (las que te dio tu nutricionista). Cierra la vigente y
 * crea una nueva con esos valores exactos, y apaga el modo adaptable para que
 * no se sobrescriban al registrar peso.
 */
export async function setManualGoal(
  input: ManualGoalInput
): Promise<ActionState> {
  const user = await getUser();
  if (!user) return { ok: false, error: "Sesión expirada." };

  const parsed = manualGoalSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues.map((i) => i.message).join(" · "),
    };
  }
  const d = parsed.data;
  const supabase = await createClient();
  const date = today();

  await supabase
    .from("nutrition_goals")
    .update({ effective_to: date })
    .eq("user_id", user.id)
    .is("effective_to", null);
  const { error } = await supabase.from("nutrition_goals").insert({
    user_id: user.id,
    kcal_target: d.kcal_target,
    protein_g: d.protein_g,
    carbs_g: d.carbs_g,
    fat_g: d.fat_g,
    effective_from: date,
    effective_to: null,
  });
  if (error) return { ok: false, error: "No se pudieron guardar las metas." };

  // Metas manuales → apagamos el modo adaptable para no pisarlas.
  await supabase.from("profiles").update({ adaptive: false }).eq("id", user.id);

  revalidatePath("/ajustes");
  revalidatePath("/dashboard");
  return { ok: true };
}
