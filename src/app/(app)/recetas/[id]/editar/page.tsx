import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { getRecipe, requireOnboarded } from "@/lib/dal";
import { scaleFood, type Food } from "@/lib/types";
import { RecipeEditor, type RecipeInitial } from "../../recipe-editor";

export const metadata: Metadata = { title: "Editar receta · Vital360" };

export default async function EditarRecetaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireOnboarded();
  const { id } = await params;
  const recipe = await getRecipe(id);
  if (!recipe) notFound();

  const initial: RecipeInitial = {
    title: recipe.title,
    servings: recipe.servings,
    prep_minutes: recipe.prep_minutes,
    instructions: recipe.instructions,
    tags: recipe.tags ?? [],
    ingredients: recipe.ingredients.map((ing) => {
      const m = ing.food
        ? scaleFood(ing.food as Food, ing.quantity_g)
        : { kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0 };
      return {
        food_id: ing.food_id,
        name: ing.name,
        quantity_g: ing.quantity_g,
        perServing: m,
      };
    }),
  };

  return (
    <div className="space-y-4">
      <Link
        href={`/recetas/${id}`}
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" /> Volver
      </Link>
      <h1 className="text-2xl font-semibold tracking-tight">Editar receta</h1>
      <RecipeEditor recipeId={id} initial={initial} />
    </div>
  );
}
