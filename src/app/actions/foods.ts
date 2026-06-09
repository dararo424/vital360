"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/dal";
import {
  foodSchema,
  logMealSchema,
  type ActionState,
  type Food,
  type FoodInput,
  type LogMealInput,
} from "@/lib/types";

/**
 * Crea un alimento en el catálogo del usuario (foods.user_id = usuario).
 * Devuelve el alimento creado para poder agregarlo de inmediato como ítem.
 */
export async function createFood(
  input: FoodInput
): Promise<{ ok: true; food: Food } | { ok: false; error: string }> {
  const user = await getUser();
  if (!user) return { ok: false, error: "Sesión expirada." };

  const parsed = foodSchema.safeParse(input);
  if (!parsed.success) {
    const first =
      Object.values(z.flattenError(parsed.error).fieldErrors)[0]?.[0] ??
      "Datos inválidos.";
    return { ok: false, error: first };
  }

  const d = parsed.data;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("foods")
    .insert({
      user_id: user.id,
      name: d.name,
      brand: d.brand || null,
      serving_g: d.serving_g,
      kcal: d.kcal,
      protein_g: d.protein_g,
      carbs_g: d.carbs_g,
      fat_g: d.fat_g,
      fiber_g: d.fiber_g === "" || d.fiber_g === undefined ? null : d.fiber_g,
    })
    .select("*")
    .single();

  if (error || !data) {
    return { ok: false, error: "No se pudo guardar el alimento." };
  }

  return { ok: true, food: data as Food };
}

/**
 * Guarda un registro de comida manual: una fila en food_logs + sus ítems
 * en food_log_items. El conteo es una estimación editable (principio Vital360).
 */
export async function logMeal(input: LogMealInput): Promise<ActionState> {
  const user = await getUser();
  if (!user) return { ok: false, error: "Sesión expirada. Inicia sesión." };

  const parsed = logMealSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Revisa los datos del registro.",
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
    };
  }

  const d = parsed.data;
  const supabase = await createClient();

  // 1. Cabecera del registro.
  const { data: log, error: logError } = await supabase
    .from("food_logs")
    .insert({
      user_id: user.id,
      meal_type: d.meal_type,
      log_date: d.log_date,
      source: d.source,
      note: d.note || null,
      ai_raw: d.ai_raw ?? null,
    })
    .select("id")
    .single();

  if (logError || !log) {
    return { ok: false, error: "No se pudo guardar la comida." };
  }

  // 2. Ítems.
  const { error: itemsError } = await supabase.from("food_log_items").insert(
    d.items.map((it) => ({
      food_log_id: log.id,
      food_id: it.food_id,
      name: it.name,
      quantity_g: it.quantity_g,
      kcal: it.kcal,
      protein_g: it.protein_g,
      carbs_g: it.carbs_g,
      fat_g: it.fat_g,
      ai_confidence: it.ai_confidence ?? null,
    }))
  );

  if (itemsError) {
    // Rollback manual: borra la cabecera para no dejar un registro vacío.
    await supabase.from("food_logs").delete().eq("id", log.id);
    return { ok: false, error: "No se pudieron guardar los alimentos." };
  }

  revalidatePath("/dashboard");
  revalidatePath("/diario");
  // Lleva al diario del día registrado para que vea su comida al instante.
  redirect(`/diario?date=${d.log_date}`);
}

/** Borra una comida registrada (food_log + sus items). */
export async function deleteFoodLog(id: string): Promise<void> {
  const user = await getUser();
  if (!user) return;
  const supabase = await createClient();
  await supabase.from("food_log_items").delete().eq("food_log_id", id);
  await supabase.from("food_logs").delete().eq("id", id).eq("user_id", user.id);
  revalidatePath("/diario");
  revalidatePath("/dashboard");
}
