"use client";

import { useTransition } from "react";
import { Heart, Loader2, Trash2 } from "lucide-react";
import { deleteRecipe, toggleFavorite } from "@/app/actions/recipes";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export function FavoriteButton({
  id,
  isFavorite,
}: {
  id: string;
  isFavorite: boolean;
}) {
  const [pending, start] = useTransition();
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label={isFavorite ? "Quitar de favoritos" : "Marcar favorito"}
      disabled={pending}
      onClick={() => start(() => toggleFavorite(id, !isFavorite))}
    >
      <Heart
        className={cn(
          "size-5",
          isFavorite && "fill-red-500 text-red-500"
        )}
      />
    </Button>
  );
}

export function DeleteRecipeButton({ id }: { id: string }) {
  const [pending, start] = useTransition();
  return (
    <Button
      type="button"
      variant="destructive"
      size="lg"
      className="h-11 w-full"
      disabled={pending}
      onClick={() => {
        if (confirm("¿Borrar esta receta? No se puede deshacer.")) {
          start(() => deleteRecipe(id));
        }
      }}
    >
      {pending ? <Loader2 className="animate-spin" /> : <Trash2 />} Borrar receta
    </Button>
  );
}
