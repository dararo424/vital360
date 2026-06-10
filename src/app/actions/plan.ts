"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/dal";
import { generateGroceryRaw, stripJsonFences } from "@/lib/gemini";
import { categorizeIngredient, MEAL_TYPES, type MealType } from "@/lib/types";

/* eslint-disable @typescript-eslint/no-explicit-any */

const grocerySchema = z.object({
  items: z.array(
    z.object({
      name: z.string().trim().min(1).max(120),
      quantity: z.string().trim().max(60),
      category: z.string().trim().max(60),
    })
  ),
});

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
        "recipes(title,servings,recipe_ingredients(name,quantity_g))," +
        "foods(name,serving_g))"
    )
    .eq("user_id", user.id)
    .eq("week_start", weekStart)
    .maybeSingle();

  const entries = (plan as any)?.meal_plan_entries ?? [];
  if (entries.length === 0)
    return { ok: false, error: "El plan de esta semana está vacío." };

  // Resumen de comidas para la IA (desglosa platos en ingredientes crudos).
  const summaryLines: string[] = [];
  // Agregado determinista (respaldo si la IA falla).
  const totals = new Map<string, number>();
  for (const e of entries) {
    const servings = e.servings || 1;
    if (e.recipes) {
      const recipeServings = e.recipes.servings || 1;
      const factor = servings / recipeServings;
      const ings = (e.recipes.recipe_ingredients ?? [])
        .map((ri: any) => `${ri.name} ${Math.round((ri.quantity_g || 0) * factor)}g`)
        .join(", ");
      summaryLines.push(
        `- ${e.recipes.title ?? "Receta"} (${servings} porción/es)${ings ? ` — ingredientes: ${ings}` : ""}`
      );
      for (const ri of e.recipes.recipe_ingredients ?? []) {
        totals.set(ri.name, (totals.get(ri.name) ?? 0) + (ri.quantity_g || 0) * factor);
      }
    } else if (e.foods) {
      summaryLines.push(`- ${e.foods.name} × ${servings} (${e.foods.serving_g}g c/u)`);
      totals.set(e.foods.name, (totals.get(e.foods.name) ?? 0) + (e.foods.serving_g || 0) * servings);
    }
  }
  if (summaryLines.length === 0)
    return { ok: false, error: "No hay comidas que agregar." };

  // 1) Intenta con IA (desglosa platos compuestos en ingredientes de mercado).
  let aiItems: { name: string; quantity: string; category: string }[] | null = null;
  try {
    const raw = await generateGroceryRaw(summaryLines.join("\n"));
    const parsed = grocerySchema.safeParse(JSON.parse(stripJsonFences(raw)));
    if (parsed.success && parsed.data.items.length > 0) aiItems = parsed.data.items;
  } catch (e) {
    console.error("grocery IA falló, uso respaldo:", e);
  }

  // 2) Respaldo determinista (suma por nombre, en gramos).
  const finalItems =
    aiItems ??
    [...totals.entries()].map(([name, grams]) => ({
      name,
      quantity: `${Math.round(grams)} g`,
      category: categorizeIngredient(name),
    }));

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

  const { error: itemsErr } = await supabase.from("grocery_items").insert(
    finalItems.map((it) => ({
      grocery_list_id: list.id,
      name: it.name,
      category: it.category,
      quantity: it.quantity,
      is_checked: false,
    }))
  );
  if (itemsErr) {
    await supabase.from("grocery_lists").delete().eq("id", list.id);
    return { ok: false, error: "No se pudieron guardar los items." };
  }

  revalidatePath("/mercado");
  redirect("/mercado");
}
