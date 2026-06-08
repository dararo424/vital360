"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getUser, today } from "@/lib/dal";
import { generatePlanRaw, stripJsonFences } from "@/lib/gemini";
import {
  ageFromBirthDate,
  buildPlanBrief,
  computePlan,
  generatedPlanSchema,
  smartOnboardingSchema,
  type SmartOnboardingInput,
} from "@/lib/nutrition-plan";
import type { ActionState } from "@/lib/types";

/**
 * Onboarding inteligente: guarda perfil + cuestionario, calcula el estimado
 * calórico por fórmula (Mifflin-St Jeor) y genera un plan personalizado con IA.
 *
 * Principio Vital360: el estimado es de apoyo y editable; la IA personaliza el
 * plan pero NO inventa las calorías (las define la fórmula). Recomendamos
 * siempre validar con un profesional.
 */
export async function completeSmartOnboarding(
  input: SmartOnboardingInput
): Promise<ActionState> {
  const user = await getUser();
  if (!user) return { ok: false, error: "Sesión expirada. Inicia sesión." };

  const parsed = smartOnboardingSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Revisa los datos del formulario.",
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
    };
  }
  const d = parsed.data;
  const supabase = await createClient();

  // 1. Estimado calórico (fórmula)
  const estimate = computePlan({
    sex: d.sex,
    age: ageFromBirthDate(d.birth_date),
    height_cm: d.height_cm,
    weight_kg: d.weight_kg,
    activity_level: d.activity_level,
    objective: d.objective,
    intensity: d.intensity,
    target_weight_kg:
      d.target_weight_kg === "" || d.target_weight_kg === undefined
        ? null
        : d.target_weight_kg,
  });

  // 2. Perfil
  const { error: pErr } = await supabase.from("profiles").upsert(
    {
      id: user.id,
      full_name: d.full_name,
      sex: d.sex,
      birth_date: d.birth_date,
      height_cm: d.height_cm,
      activity_level: d.activity_level,
      objective: d.objective,
      target_weight_kg:
        d.target_weight_kg === "" || d.target_weight_kg === undefined
          ? null
          : d.target_weight_kg,
      intensity: d.intensity,
      adaptive: d.adaptive,
      onboarding: d.questionnaire ?? {},
    },
    { onConflict: "id" }
  );
  if (pErr) return { ok: false, error: "No se pudo guardar el perfil." };

  // 3. Peso de hoy en body_metrics (1 por día → update o insert)
  const date = today();
  const { data: existingMetric } = await supabase
    .from("body_metrics")
    .select("id")
    .eq("user_id", user.id)
    .gte("measured_at", date)
    .maybeSingle();
  if (existingMetric) {
    await supabase.from("body_metrics").update({ weight_kg: d.weight_kg }).eq("id", existingMetric.id);
  } else {
    await supabase.from("body_metrics").insert({ user_id: user.id, measured_at: date, weight_kg: d.weight_kg });
  }

  // 4. Meta de nutrición vigente (cierra la anterior → histórico intacto)
  await supabase
    .from("nutrition_goals")
    .update({ effective_to: date })
    .eq("user_id", user.id)
    .is("effective_to", null);
  const { error: gErr } = await supabase.from("nutrition_goals").insert({
    user_id: user.id,
    kcal_target: estimate.daily_kcal,
    protein_g: estimate.protein_g,
    carbs_g: estimate.carbs_g,
    fat_g: estimate.fat_g,
    effective_from: date,
    effective_to: null,
  });
  if (gErr) return { ok: false, error: "No se pudo guardar la meta." };

  // 5. Plan personalizado con IA (no bloquea el onboarding si falla)
  try {
    const raw = await generatePlanRaw(buildPlanBrief(d, estimate));
    const plan = generatedPlanSchema.safeParse(JSON.parse(stripJsonFences(raw)));
    if (plan.success) {
      await supabase
        .from("profiles")
        .update({
          plan: { ...plan.data, estimate },
          plan_generated_at: new Date().toISOString(),
        })
        .eq("id", user.id);
    }
  } catch (e) {
    console.error("Plan IA falló (onboarding continúa):", e);
  }

  revalidatePath("/mi-plan");
  revalidatePath("/dashboard");
  redirect("/mi-plan");
}

/* eslint-disable @typescript-eslint/no-explicit-any */
/** Regenera el plan con IA a partir del perfil ya guardado (peso más reciente). */
export async function regeneratePlan(): Promise<{ ok: boolean; error?: string }> {
  const user = await getUser();
  if (!user) return { ok: false, error: "Sesión expirada." };

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();
  const p = profile as any;
  if (!p?.objective || !p?.intensity || !p?.birth_date) {
    return { ok: false, error: "Completa primero tu perfil." };
  }

  const { data: metric } = await supabase
    .from("body_metrics")
    .select("weight_kg")
    .eq("user_id", user.id)
    .not("weight_kg", "is", null)
    .order("measured_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const weight = (metric as any)?.weight_kg;
  if (!weight) return { ok: false, error: "Registra tu peso primero." };

  const data = {
    full_name: p.full_name ?? "",
    sex: p.sex,
    birth_date: p.birth_date,
    height_cm: p.height_cm,
    weight_kg: weight,
    activity_level: p.activity_level,
    objective: p.objective,
    target_weight_kg: p.target_weight_kg ?? "",
    intensity: p.intensity,
    adaptive: p.adaptive ?? true,
    questionnaire: p.onboarding ?? {},
  };
  const check = smartOnboardingSchema.safeParse(data);
  if (!check.success) return { ok: false, error: "Tu perfil está incompleto." };

  const estimate = computePlan({
    sex: check.data.sex,
    age: ageFromBirthDate(check.data.birth_date),
    height_cm: check.data.height_cm,
    weight_kg: check.data.weight_kg,
    activity_level: check.data.activity_level,
    objective: check.data.objective,
    intensity: check.data.intensity,
    target_weight_kg:
      check.data.target_weight_kg === "" || check.data.target_weight_kg === undefined
        ? null
        : check.data.target_weight_kg,
  });

  try {
    const raw = await generatePlanRaw(buildPlanBrief(check.data, estimate));
    const plan = generatedPlanSchema.safeParse(JSON.parse(stripJsonFences(raw)));
    if (!plan.success) return { ok: false, error: "La IA devolvió un formato inesperado." };
    await supabase
      .from("profiles")
      .update({
        plan: { ...plan.data, estimate },
        plan_generated_at: new Date().toISOString(),
      })
      .eq("id", user.id);
  } catch (e) {
    console.error("regeneratePlan:", e);
    return { ok: false, error: "No se pudo generar el plan. Intenta de nuevo." };
  }

  revalidatePath("/mi-plan");
  return { ok: true };
}
/* eslint-enable @typescript-eslint/no-explicit-any */
