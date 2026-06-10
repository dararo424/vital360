"use client";

import { useState, useTransition } from "react";
import { BookmarkPlus, CopyPlus, Loader2, Trash2 } from "lucide-react";
import { deleteFoodLog, repeatFoodLog } from "@/app/actions/foods";
import { createRecipe } from "@/app/actions/recipes";
import { Button } from "@/components/ui/button";

type RecipeItem = {
  food_id: string | null;
  name: string;
  quantity_g: number;
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
};

export function SaveAsRecipeButton({ items }: { items: RecipeItem[] }) {
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  return (
    <div>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-8 text-xs text-muted-foreground"
        disabled={pending}
        onClick={() => {
          setErr(null);
          start(async () => {
            const title =
              items.map((i) => i.name).slice(0, 3).join(", ").slice(0, 90) || "Comida";
            // createRecipe redirige a la receta creada en caso de éxito.
            const res = await createRecipe({
              title,
              servings: 1,
              tags: ["de_comida"],
              ingredients: items.map((i) => ({
                food_id: i.food_id,
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
        Guardar como receta
      </Button>
      {err && <p className="mt-1 text-xs text-destructive">{err}</p>}
    </div>
  );
}

export function RepeatMealButton({ id }: { id: string }) {
  const [pending, start] = useTransition();
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      aria-label="Repetir hoy"
      title="Repetir hoy"
      disabled={pending}
      onClick={() =>
        start(async () => {
          await repeatFoodLog(id);
        })
      }
    >
      {pending ? (
        <Loader2 className="animate-spin" />
      ) : (
        <CopyPlus className="size-4 text-muted-foreground" />
      )}
    </Button>
  );
}

export function DeleteMealButton({ id }: { id: string }) {
  const [pending, start] = useTransition();
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      aria-label="Borrar comida"
      disabled={pending}
      onClick={() => {
        if (confirm("¿Borrar esta comida?")) start(() => deleteFoodLog(id));
      }}
    >
      {pending ? (
        <Loader2 className="animate-spin" />
      ) : (
        <Trash2 className="size-4 text-muted-foreground" />
      )}
    </Button>
  );
}
