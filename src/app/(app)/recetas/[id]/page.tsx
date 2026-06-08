import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Clock, Pencil } from "lucide-react";
import { getRecipe, requireOnboarded } from "@/lib/dal";
import { RECIPE_TAG_LABELS } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DeleteRecipeButton,
  FavoriteButton,
  GenerateRecipePhotoButton,
} from "../recipe-actions";

export const metadata: Metadata = { title: "Receta · Vital360" };
export const maxDuration = 60; // generación de foto con IA

export default async function RecipeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireOnboarded();
  const { id } = await params;
  const recipe = await getRecipe(id);
  if (!recipe) notFound();

  const macros = [
    { label: "Calorías", value: recipe.perServing.kcal, unit: "kcal" },
    { label: "Proteína", value: recipe.perServing.protein_g, unit: "g" },
    { label: "Carbos", value: recipe.perServing.carbs_g, unit: "g" },
    { label: "Grasa", value: recipe.perServing.fat_g, unit: "g" },
  ];

  return (
    <div className="space-y-5">
      <Link
        href="/recetas"
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" /> Recetas
      </Link>

      {recipe.image_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={recipe.image_url}
          alt={recipe.title}
          className="h-52 w-full rounded-xl object-cover"
        />
      )}

      <header className="flex items-start justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{recipe.title}</h1>
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            {recipe.servings} porciones
            {recipe.prep_minutes != null && (
              <span className="inline-flex items-center gap-1">
                · <Clock className="size-3.5" /> {recipe.prep_minutes} min
              </span>
            )}
          </p>
        </div>
        <FavoriteButton id={recipe.id} isFavorite={recipe.is_favorite} />
      </header>

      {recipe.tags && recipe.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {recipe.tags.map((t) => (
            <span key={t} className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">
              {RECIPE_TAG_LABELS[t] ?? t}
            </span>
          ))}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Macros por porción</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-4 gap-2">
            {macros.map((m) => (
              <div key={m.label} className="rounded-lg border bg-muted/30 p-2 text-center">
                <dt className="text-[11px] text-muted-foreground">{m.label}</dt>
                <dd className="text-lg font-semibold tabular-nums">{m.value}</dd>
                <dd className="text-[10px] text-muted-foreground">{m.unit}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-2 text-xs text-muted-foreground">
            Total receta: {recipe.total.kcal} kcal.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ingredientes</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="divide-y text-sm">
            {recipe.ingredients.map((ing) => (
              <li key={ing.id} className="flex items-center justify-between py-2">
                <span>{ing.name}</span>
                <span className="text-muted-foreground">{ing.quantity_g} g</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {recipe.instructions && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Instrucciones</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm text-muted-foreground">
              {recipe.instructions}
            </p>
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        <GenerateRecipePhotoButton id={recipe.id} hasPhoto={!!recipe.image_url} />
        <Button asChild variant="outline" size="lg" className="h-11 w-full">
          <Link href={`/recetas/${recipe.id}/editar`}>
            <Pencil /> Editar
          </Link>
        </Button>
        <DeleteRecipeButton id={recipe.id} />
      </div>
    </div>
  );
}
