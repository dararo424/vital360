"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getUser, getRemainingMacros } from "@/lib/dal";
import { suggestRecipeRaw, stripJsonFences } from "@/lib/gemini";
import {
  recipeSchema,
  suggestedRecipeSchema,
  type ActionState,
  type RecipeInput,
  type SuggestedRecipe,
} from "@/lib/types";

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Inserta los ingredientes de una receta. Los ingredientes ad-hoc (food_id null)
 * se crean como foods primero, porque recipe_ingredients no almacena macros.
 */
async function insertIngredients(
  supabase: any,
  recipeId: string,
  userId: string,
  ingredients: RecipeInput["ingredients"]
): Promise<boolean> {
  const rows = [];
  for (const ing of ingredients) {
    let foodId = ing.food_id;
    if (!foodId) {
      const { data: food, error } = await supabase
        .from("foods")
        .insert({
          user_id: userId,
          name: ing.name,
          serving_g: ing.quantity_g,
          kcal: ing.kcal,
          protein_g: ing.protein_g,
          carbs_g: ing.carbs_g,
          fat_g: ing.fat_g,
        })
        .select("id")
        .single();
      if (error || !food) return false;
      foodId = food.id;
    }
    rows.push({
      recipe_id: recipeId,
      food_id: foodId,
      name: ing.name,
      quantity_g: ing.quantity_g,
    });
  }
  const { error } = await supabase.from("recipe_ingredients").insert(rows);
  return !error;
}

export async function createRecipe(input: RecipeInput): Promise<ActionState> {
  const user = await getUser();
  if (!user) return { ok: false, error: "Sesión expirada." };

  const parsed = recipeSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Revisa los datos de la receta.",
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
    };
  }
  const d = parsed.data;
  const supabase = await createClient();

  const { data: recipe, error } = await supabase
    .from("recipes")
    .insert({
      user_id: user.id,
      title: d.title,
      servings: d.servings,
      tags: d.tags,
      instructions: d.instructions || null,
      prep_minutes: d.prep_minutes ?? null,
    })
    .select("id")
    .single();

  if (error || !recipe) return { ok: false, error: "No se pudo crear la receta." };

  const ok = await insertIngredients(supabase, recipe.id, user.id, d.ingredients);
  if (!ok) {
    await supabase.from("recipes").delete().eq("id", recipe.id);
    return { ok: false, error: "No se pudieron guardar los ingredientes." };
  }

  revalidatePath("/recetas");
  redirect(`/recetas/${recipe.id}`);
}

export async function updateRecipe(
  id: string,
  input: RecipeInput
): Promise<ActionState> {
  const user = await getUser();
  if (!user) return { ok: false, error: "Sesión expirada." };

  const parsed = recipeSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Revisa los datos de la receta.",
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
    };
  }
  const d = parsed.data;
  const supabase = await createClient();

  const { error: upErr } = await supabase
    .from("recipes")
    .update({
      title: d.title,
      servings: d.servings,
      tags: d.tags,
      instructions: d.instructions || null,
      prep_minutes: d.prep_minutes ?? null,
    })
    .eq("id", id)
    .eq("user_id", user.id);

  if (upErr) return { ok: false, error: "No se pudo actualizar la receta." };

  // Reemplaza ingredientes.
  await supabase.from("recipe_ingredients").delete().eq("recipe_id", id);
  const ok = await insertIngredients(supabase, id, user.id, d.ingredients);
  if (!ok) return { ok: false, error: "No se pudieron guardar los ingredientes." };

  revalidatePath("/recetas");
  revalidatePath(`/recetas/${id}`);
  redirect(`/recetas/${id}`);
}

export async function deleteRecipe(id: string): Promise<void> {
  const user = await getUser();
  if (!user) return;
  const supabase = await createClient();
  await supabase.from("recipe_ingredients").delete().eq("recipe_id", id);
  await supabase.from("recipes").delete().eq("id", id).eq("user_id", user.id);
  revalidatePath("/recetas");
  redirect("/recetas");
}

export async function toggleFavorite(id: string, value: boolean): Promise<void> {
  const user = await getUser();
  if (!user) return;
  const supabase = await createClient();
  await supabase
    .from("recipes")
    .update({ is_favorite: value })
    .eq("id", id)
    .eq("user_id", user.id);
  revalidatePath("/recetas");
  revalidatePath(`/recetas/${id}`);
}

export async function suggestRecipe(
  notes?: string
): Promise<{ ok: true; recipe: SuggestedRecipe } | { ok: false; error: string }> {
  const user = await getUser();
  if (!user) return { ok: false, error: "Sesión expirada." };

  const remaining = await getRemainingMacros();
  if (!remaining) {
    return { ok: false, error: "Necesitas una meta de nutrición vigente." };
  }

  let raw: string;
  try {
    raw = await suggestRecipeRaw(remaining, notes);
  } catch (e) {
    console.error("Gemini suggestRecipe error:", e);
    return { ok: false, error: "No se pudo generar la sugerencia. Intenta de nuevo." };
  }

  try {
    const parsed = JSON.parse(stripJsonFences(raw));
    const result = suggestedRecipeSchema.safeParse(parsed);
    if (!result.success) {
      return { ok: false, error: "La IA devolvió un formato inesperado." };
    }
    return { ok: true, recipe: result.data };
  } catch {
    return { ok: false, error: "La IA devolvió un formato inesperado." };
  }
}
