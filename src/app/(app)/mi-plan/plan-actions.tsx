"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BookmarkPlus, ImagePlus, Loader2, RefreshCw } from "lucide-react";
import { generatePlanRecipePhoto, regeneratePlan } from "@/app/actions/onboarding";
import { createRecipe } from "@/app/actions/recipes";
import { Button } from "@/components/ui/button";

export function RegenerateButton() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  return (
    <div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-9"
        disabled={pending}
        onClick={() => {
          setErr(null);
          start(async () => {
            const res = await regeneratePlan();
            if (!res.ok) setErr(res.error ?? "Error");
            else router.refresh();
          });
        }}
      >
        {pending ? <Loader2 className="animate-spin" /> : <RefreshCw />}
        {pending ? "Generando…" : "Regenerar"}
      </Button>
      {err && <p className="mt-1 text-xs text-destructive">{err}</p>}
    </div>
  );
}

export function GeneratePlanPhotoButton({ index }: { index: number }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  return (
    <div>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        className="h-8"
        disabled={pending}
        onClick={() => {
          setErr(null);
          start(async () => {
            const res = await generatePlanRecipePhoto(index);
            if (!res.ok) setErr(res.error ?? "Error");
            else router.refresh();
          });
        }}
      >
        {pending ? <Loader2 className="animate-spin" /> : <ImagePlus />}
        {pending ? "Generando…" : "Generar foto"}
      </Button>
      {err && <p className="mt-1 text-xs text-destructive">{err}</p>}
    </div>
  );
}

type PlanRecipe = {
  title: string;
  servings: number;
  image_url?: string;
  ingredients: { name: string; quantity_g: number; kcal: number; protein_g: number; carbs_g: number; fat_g: number }[];
  steps: string[];
};

export function SaveRecipeButton({ recipe }: { recipe: PlanRecipe }) {
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  return (
    <div>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        className="h-8"
        disabled={pending}
        onClick={() => {
          setErr(null);
          start(async () => {
            // createRecipe redirige a la receta guardada en caso de éxito.
            const res = await createRecipe({
              title: recipe.title,
              servings: recipe.servings,
              tags: ["sugerida_ia"],
              image_url: recipe.image_url || "",
              instructions: recipe.steps.map((s, i) => `${i + 1}. ${s}`).join("\n"),
              ingredients: recipe.ingredients.map((i) => ({
                food_id: null,
                name: i.name,
                quantity_g: i.quantity_g,
                kcal: i.kcal,
                protein_g: i.protein_g,
                carbs_g: i.carbs_g,
                fat_g: i.fat_g,
              })),
            });
            if (res && !res.ok) setErr(res.error);
          });
        }}
      >
        {pending ? <Loader2 className="animate-spin" /> : <BookmarkPlus />}
        Guardar receta
      </Button>
      {err && <p className="mt-1 text-xs text-destructive">{err}</p>}
    </div>
  );
}
