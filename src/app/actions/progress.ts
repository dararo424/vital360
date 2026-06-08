"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/dal";
import { bodyMetricSchema, type ActionState, type BodyMetricInput } from "@/lib/types";

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
): Promise<ActionState> {
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

  revalidatePath("/progreso");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function deleteBodyMetric(id: string): Promise<void> {
  const user = await getUser();
  if (!user) return;
  const supabase = await createClient();
  await supabase.from("body_metrics").delete().eq("id", id).eq("user_id", user.id);
  revalidatePath("/progreso");
  revalidatePath("/dashboard");
}
