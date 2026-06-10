"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getUser, today } from "@/lib/dal";
import { searchOff, lookupBarcode } from "@/lib/openfoodfacts";
import type { OffDraft } from "@/lib/types";
import {
  foodSchema,
  logItemSchema,
  logMealSchema,
  MEAL_TYPES,
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

/** Marca/desmarca un alimento del catálogo como favorito. */
export async function setFoodFavorite(
  foodId: string,
  value: boolean
): Promise<{ ok: boolean }> {
  const user = await getUser();
  if (!user) return { ok: false };
  const supabase = await createClient();
  // RLS solo permite actualizar alimentos propios.
  const { error } = await supabase
    .from("foods")
    .update({ is_favorite: value })
    .eq("id", foodId)
    .eq("user_id", user.id);
  revalidatePath("/log");
  return { ok: !error };
}

/** Busca alimentos en Open Food Facts (por texto). */
export async function searchOffAction(query: string): Promise<OffDraft[]> {
  const user = await getUser();
  if (!user || query.trim().length < 2) return [];
  return searchOff(query.trim());
}

/** Busca un producto por código de barras en Open Food Facts. */
export async function lookupBarcodeAction(
  code: string
): Promise<OffDraft | null> {
  const user = await getUser();
  if (!user) return null;
  return lookupBarcode(code);
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
      fiber_g: it.fiber_g ?? null,
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

const updateMealSchema = z.object({
  meal_type: z.enum(MEAL_TYPES, { message: "Selecciona la comida" }),
  log_date: z
    .string()
    .min(1, "Fecha requerida")
    .refine((v) => !Number.isNaN(Date.parse(v)), "Fecha inválida"),
  note: z.string().trim().max(280).optional().or(z.literal("")),
  items: z.array(logItemSchema).min(1, "Debe quedar al menos un alimento"),
});
export type UpdateMealInput = z.infer<typeof updateMealSchema>;

/** Edita una comida registrada: actualiza la cabecera y reemplaza los ítems. */
export async function updateFoodLog(
  id: string,
  input: UpdateMealInput
): Promise<ActionState> {
  const user = await getUser();
  if (!user) return { ok: false, error: "Sesión expirada." };

  const parsed = updateMealSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Revisa los datos del registro.",
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
    };
  }
  const d = parsed.data;
  const supabase = await createClient();

  const { error: upErr } = await supabase
    .from("food_logs")
    .update({
      meal_type: d.meal_type,
      log_date: d.log_date,
      note: d.note || null,
    })
    .eq("id", id)
    .eq("user_id", user.id);
  if (upErr) return { ok: false, error: "No se pudo actualizar la comida." };

  await supabase.from("food_log_items").delete().eq("food_log_id", id);
  const { error: itErr } = await supabase.from("food_log_items").insert(
    d.items.map((it) => ({
      food_log_id: id,
      food_id: it.food_id,
      name: it.name,
      quantity_g: it.quantity_g,
      kcal: it.kcal,
      protein_g: it.protein_g,
      carbs_g: it.carbs_g,
      fat_g: it.fat_g,
      fiber_g: it.fiber_g ?? null,
      ai_confidence: it.ai_confidence ?? null,
    }))
  );
  if (itErr) return { ok: false, error: "No se pudieron guardar los alimentos." };

  revalidatePath("/diario");
  revalidatePath("/dashboard");
  redirect(`/diario?date=${d.log_date}`);
}

/** Repite una comida registrada: la vuelve a registrar hoy con los mismos ítems. */
export async function repeatFoodLog(id: string): Promise<ActionState> {
  const user = await getUser();
  if (!user) return { ok: false, error: "Sesión expirada." };
  const supabase = await createClient();

  const { data: log } = await supabase
    .from("food_logs")
    .select(
      "meal_type,note,food_log_items(food_id,name,quantity_g,kcal,protein_g,carbs_g,fat_g,fiber_g,ai_confidence)"
    )
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!log) return { ok: false, error: "Comida no encontrada." };

  const items = (log as { food_log_items?: unknown[] }).food_log_items ?? [];
  if (items.length === 0) return { ok: false, error: "Esta comida no tiene alimentos." };

  const date = today();
  const { data: newLog, error: lErr } = await supabase
    .from("food_logs")
    .insert({
      user_id: user.id,
      meal_type: (log as { meal_type: string }).meal_type,
      log_date: date,
      source: "manual",
      note: (log as { note: string | null }).note,
    })
    .select("id")
    .single();
  if (lErr || !newLog) return { ok: false, error: "No se pudo repetir la comida." };

  const { error: iErr } = await supabase.from("food_log_items").insert(
    (items as Record<string, unknown>[]).map((it) => ({
      food_log_id: newLog.id,
      food_id: it.food_id,
      name: it.name,
      quantity_g: it.quantity_g,
      kcal: it.kcal,
      protein_g: it.protein_g,
      carbs_g: it.carbs_g,
      fat_g: it.fat_g,
      fiber_g: it.fiber_g ?? null,
      ai_confidence: it.ai_confidence ?? null,
    }))
  );
  if (iErr) {
    await supabase.from("food_logs").delete().eq("id", newLog.id);
    return { ok: false, error: "No se pudieron copiar los alimentos." };
  }

  revalidatePath("/diario");
  revalidatePath("/dashboard");
  redirect(`/diario?date=${date}`);
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
