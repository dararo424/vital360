"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Heart, ImagePlus, Loader2, Trash2 } from "lucide-react";
import {
  deleteRecipe,
  generateRecipePhoto,
  toggleFavorite,
} from "@/app/actions/recipes";
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

export function GenerateRecipePhotoButton({
  id,
  hasPhoto,
}: {
  id: string;
  hasPhoto: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  return (
    <div>
      <Button
        type="button"
        variant="outline"
        size="lg"
        className="h-11 w-full"
        disabled={pending}
        onClick={() => {
          setErr(null);
          start(async () => {
            const res = await generateRecipePhoto(id);
            if (!res.ok) setErr(res.error ?? "Error");
            else router.refresh();
          });
        }}
      >
        {pending ? <Loader2 className="animate-spin" /> : <ImagePlus />}
        {pending ? "Generando foto…" : hasPhoto ? "Regenerar foto" : "Generar foto con IA"}
      </Button>
      {err && <p className="mt-1 text-xs text-destructive">{err}</p>}
    </div>
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
