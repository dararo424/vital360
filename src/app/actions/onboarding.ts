"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/dal";
import { onboardingSchema, type ActionState } from "@/lib/types";

/**
 * Completa el onboarding: guarda el perfil y crea la meta de nutrición vigente.
 *
 * Principio del Plan Maestro: las metas las define el nutricionista del usuario;
 * la app solo las refleja. Por eso aquí simplemente persistimos lo que cargó el
 * usuario, sin calcular ni "sugerir" objetivos.
 */
export async function completeOnboarding(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await getUser();
  if (!user) return { ok: false, error: "Sesión expirada. Inicia sesión." };

  const parsed = onboardingSchema.safeParse({
    full_name: formData.get("full_name"),
    sex: formData.get("sex"),
    birth_date: formData.get("birth_date"),
    height_cm: formData.get("height_cm"),
    activity_level: formData.get("activity_level"),
    kcal: formData.get("kcal"),
    protein_g: formData.get("protein_g"),
    carbs_g: formData.get("carbs_g"),
    fat_g: formData.get("fat_g"),
  });

  if (!parsed.success) {
    return {
      ok: false,
      error: "Revisa los campos del formulario.",
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
    };
  }

  const d = parsed.data;
  const supabase = await createClient();

  // 1. Upsert del perfil (la fila puede existir ya por un trigger en signup).
  const { error: profileError } = await supabase.from("profiles").upsert(
    {
      id: user.id,
      full_name: d.full_name,
      sex: d.sex,
      birth_date: d.birth_date,
      height_cm: d.height_cm,
      activity_level: d.activity_level,
      onboarding_completed: true,
    },
    { onConflict: "id" }
  );

  if (profileError) {
    return { ok: false, error: "No se pudo guardar el perfil." };
  }

  // 2. Cerrar cualquier meta vigente previa (histórico intacto).
  const today = new Date().toISOString().slice(0, 10);
  await supabase
    .from("nutrition_goals")
    .update({ effective_to: today })
    .eq("user_id", user.id)
    .is("effective_to", null);

  // 3. Crear la nueva meta vigente.
  const { error: goalError } = await supabase.from("nutrition_goals").insert({
    user_id: user.id,
    kcal: d.kcal,
    protein_g: d.protein_g,
    carbs_g: d.carbs_g,
    fat_g: d.fat_g,
    effective_from: today,
    effective_to: null,
  });

  if (goalError) {
    return { ok: false, error: "No se pudo guardar la meta de nutrición." };
  }

  redirect("/dashboard");
}
