"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getUser, today } from "@/lib/dal";
import { ageFromBirthDate, computePlan } from "@/lib/nutrition-plan";
import { bodyMetricSchema, type BodyMetricInput } from "@/lib/types";

type SaveResult =
  | { ok: true; recalced?: boolean }
  | { ok: false; error: string }
  | null;

function num(v: number | "" | undefined): number | null {
  return v === "" || v === undefined ? null : v;
}

function nextDay(dateIso: string): string {
  const d = new Date(dateIso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

/** Guarda peso/medidas para una fecha (1 registro por día: update o insert). */
export async function saveBodyMetric(
  input: BodyMetricInput
): Promise<SaveResult> {
  const user = await getUser();
  if (!user) return { ok: false, error: "Sesión expirada." };

  const parsed = bodyMetricSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: z.flattenError(parsed.error).formErrors[0] ?? "Revisa los datos.",
    };
  }
  const d = parsed.data;
  const date = d.measured_at.slice(0, 10);
  const supabase = await createClient();

  const fields = {
    weight_kg: num(d.weight_kg),
    body_fat_pct: num(d.body_fat_pct),
    waist_cm: num(d.waist_cm),
    chest_cm: num(d.chest_cm),
    arm_cm: num(d.arm_cm),
    thigh_cm: num(d.thigh_cm),
    note: d.note || null,
  };

  // ¿Ya hay registro ese día? (measured_at es timestamptz → rango del día)
  const { data: existing } = await supabase
    .from("body_metrics")
    .select("id")
    .eq("user_id", user.id)
    .gte("measured_at", date)
    .lt("measured_at", nextDay(date))
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("body_metrics")
      .update(fields)
      .eq("id", existing.id);
    if (error) return { ok: false, error: "No se pudo actualizar el registro." };
  } else {
    const { error } = await supabase
      .from("body_metrics")
      .insert({ user_id: user.id, measured_at: date, ...fields });
    if (error) return { ok: false, error: "No se pudo guardar el registro." };
  }

  // Modo adaptable: si registró peso, recalcula la meta automáticamente.
  let recalced = false;
  if (fields.weight_kg != null) {
    recalced = await maybeRecalcGoal(supabase, user.id, fields.weight_kg);
  }

  revalidatePath("/progreso");
  revalidatePath("/dashboard");
  revalidatePath("/mi-plan");
  return { ok: true, recalced };
}

/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Recalcula el estimado (fórmula) con el peso nuevo y, si cambió de forma
 * relevante, cierra la meta vigente y crea una nueva. Solo si el perfil está
 * en modo `adaptive`. No regenera el plan IA (eso es manual, para no gastar
 * tiempo/cuota en cada registro de peso).
 */
async function maybeRecalcGoal(
  supabase: any,
  userId: string,
  weight: number
): Promise<boolean> {
  const { data: p } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();
  if (
    !p?.adaptive ||
    !p.objective ||
    !p.intensity ||
    !p.sex ||
    !p.birth_date ||
    !p.height_cm ||
    !p.activity_level
  ) {
    return false;
  }

  const est = computePlan({
    sex: p.sex,
    age: ageFromBirthDate(p.birth_date),
    height_cm: p.height_cm,
    weight_kg: weight,
    activity_level: p.activity_level,
    objective: p.objective,
    intensity: p.intensity,
    target_weight_kg: p.target_weight_kg ?? null,
  });

  const { data: goal } = await supabase
    .from("nutrition_goals")
    .select("*")
    .eq("user_id", userId)
    .is("effective_to", null)
    .order("effective_from", { ascending: false })
    .limit(1)
    .maybeSingle();

  // Sin cambio relevante → no creamos una meta nueva.
  if (
    goal &&
    Math.abs(goal.kcal_target - est.daily_kcal) < 25 &&
    Math.abs(goal.protein_g - est.protein_g) < 3
  ) {
    return false;
  }

  const date = today();
  await supabase
    .from("nutrition_goals")
    .update({ effective_to: date })
    .eq("user_id", userId)
    .is("effective_to", null);
  await supabase.from("nutrition_goals").insert({
    user_id: userId,
    kcal_target: est.daily_kcal,
    protein_g: est.protein_g,
    carbs_g: est.carbs_g,
    fat_g: est.fat_g,
    effective_from: date,
    effective_to: null,
  });

  // Mantén el estimado del plan en sincronía con la meta.
  if (p.plan) {
    await supabase
      .from("profiles")
      .update({ plan: { ...p.plan, estimate: est } })
      .eq("id", userId);
  }
  return true;
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export async function deleteBodyMetric(id: string): Promise<void> {
  const user = await getUser();
  if (!user) return;
  const supabase = await createClient();
  await supabase.from("body_metrics").delete().eq("id", id).eq("user_id", user.id);
  revalidatePath("/progreso");
  revalidatePath("/dashboard");
}
