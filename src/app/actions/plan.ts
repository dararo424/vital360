"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/dal";
import { categorizeIngredient, MEAL_TYPES, type MealType } from "@/lib/types";

/* eslint-disable @typescript-eslint/no-explicit-any */

/** Obtiene (o crea) el plan de la semana para el usuario actual. */
async function getOrCreatePlan(
  supabase: any,
  userId: string,
  weekStart: string
): Promise<string | null> {
  const { data: existing } = await supabase
    .from("meal_plans")
    .select("id")
    .eq("user_id", userId)
    .eq("week_start", weekStart)
    .maybeSingle();
  if (existing) return existing.id;

  const { data: created, error } = await supabase
    .from("meal_plans")
    .insert({ user_id: userId, week_start: weekStart })
    .select("id")
    .single();
  if (error || !created) return null;
  return created.id;
}

type AddEntry = {
  week_start: string;
  entry_date: string;
  meal_type: MealType;
  recipe_id?: string | null;
  food_id?: string | null;
  servings: number;
};

export async function addPlanEntry(
  input: AddEntry
): Promise<{ ok: boolean; error?: string }> {
  const user = await getUser();
  if (!user) return { ok: false, error: "Sesión expirada." };
  if (!MEAL_TYPES.includes(input.meal_type))
    return { ok: false, error: "Comida inválida." };
  if (!input.recipe_id && !input.food_id)
    return { ok: false, error: "Elige una receta o alimento." };

  const supabase = await createClient();
  const planId = await getOrCreatePlan(supabase, user.id, input.week_start);
  if (!planId) return { ok: false, error: "No se pudo crear el plan." };

  const { error } = await supabase.from("meal_plan_entries").insert({
    meal_plan_id: planId,
    entry_date: input.entry_date,
    meal_type: input.meal_type,
    recipe_id: input.recipe_id ?? null,
    food_id: input.food_id ?? null,
    servings: input.servings > 0 ? input.servings : 1,
  });
  if (error) return { ok: false, error: "No se pudo agregar al plan." };

  revalidatePath("/plan");
  return { ok: true };
}

export async function removePlanEntry(id: string): Promise<void> {
  const user = await getUser();
  if (!user) return;
  const supabase = await createClient();
  // RLS (vía meal_plan_id → meal_plans.user_id) restringe a lo propio.
  await supabase.from("meal_plan_entries").delete().eq("id", id);
  revalidatePath("/plan");
}

export async function toggleGroceryItem(
  id: string,
  value: boolean
): Promise<void> {
  const user = await getUser();
  if (!user) return;
  const supabase = await createClient();
  await supabase.from("grocery_items").update({ is_checked: value }).eq("id", id);
  revalidatePath("/mercado");
}

/** Genera una lista de mercado agregando los ingredientes del plan semanal. */
export async function generateGroceryList(
  weekStart: string
): Promise<{ ok: boolean; error?: string }> {
  const user = await getUser();
  if (!user) return { ok: false, error: "Sesión expirada." };

  const supabase = await createClient();
  const { data: plan } = await supabase
    .from("meal_plans")
    .select(
      "id,meal_plan_entries(servings,recipe_id,food_id," +
        "recipes(servings,recipe_ingredients(name,quantity_g))," +
        "foods(name,serving_g))"
    )
    .eq("user_id", user.id)
    .eq("week_start", weekStart)
    .maybeSingle();

  const entries = (plan as any)?.meal_plan_entries ?? [];
  if (entries.length === 0)
    return { ok: false, error: "El plan de esta semana está vacío." };

  // Agrega gramos por nombre de ingrediente.
  const totals = new Map<string, number>();
  for (const e of entries) {
    if (e.recipes) {
      const recipeServings = e.recipes.servings || 1;
      const factor = (e.servings || 1) / recipeServings;
      for (const ri of e.recipes.recipe_ingredients ?? []) {
        const grams = (ri.quantity_g || 0) * factor;
        totals.set(ri.name, (totals.get(ri.name) ?? 0) + grams);
      }
    } else if (e.foods) {
      const grams = (e.foods.serving_g || 0) * (e.servings || 1);
      totals.set(e.foods.name, (totals.get(e.foods.name) ?? 0) + grams);
    }
  }

  if (totals.size === 0)
    return { ok: false, error: "No hay ingredientes que agregar." };

  // Crea la lista y sus items.
  const { data: list, error: listErr } = await supabase
    .from("grocery_lists")
    .insert({
      user_id: user.id,
      meal_plan_id: (plan as any).id,
      title: `Lista semana del ${weekStart}`,
    })
    .select("id")
    .single();
  if (listErr || !list) return { ok: false, error: "No se pudo crear la lista." };

  const items = [...totals.entries()].map(([name, grams]) => ({
    grocery_list_id: list.id,
    name,
    category: categorizeIngredient(name),
    quantity: `${Math.round(grams)} g`,
    is_checked: false,
  }));
  const { error: itemsErr } = await supabase.from("grocery_items").insert(items);
  if (itemsErr) {
    await supabase.from("grocery_lists").delete().eq("id", list.id);
    return { ok: false, error: "No se pudieron guardar los items." };
  }

  revalidatePath("/mercado");
  redirect("/mercado");
}
