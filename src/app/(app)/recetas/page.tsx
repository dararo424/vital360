import type { Metadata } from "next";
import Link from "next/link";
import { Heart, Plus, UtensilsCrossed } from "lucide-react";
import { getRecipes, requireOnboarded } from "@/lib/dal";
import { RECIPE_TAG_LABELS } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = { title: "Recetas · Vital360" };

export default async function RecetasPage() {
  await requireOnboarded();
  const recipes = await getRecipes();

  return (
    <div className="space-y-5">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Recetas</h1>
        <Button asChild size="sm" className="h-9">
          <Link href="/recetas/nueva">
            <Plus /> Nueva
          </Link>
        </Button>
      </header>

      {recipes.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <div className="flex size-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <UtensilsCrossed className="size-7" />
          </div>
          <p className="max-w-xs text-sm text-muted-foreground">
            Aún no tienes recetas. Crea una o pídele a la IA que te sugiera una
            dentro de tus macros.
          </p>
          <Button asChild className="h-10">
            <Link href="/recetas/nueva">
              <Plus /> Crear receta
            </Link>
          </Button>
        </div>
      ) : (
        <ul className="space-y-3">
          {recipes.map((r) => (
            <li key={r.id}>
              <Link href={`/recetas/${r.id}`}>
                <Card className="transition-colors hover:bg-muted/40">
                  <CardContent className="py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="flex items-center gap-1.5 font-medium">
                          {r.title}
                          {r.is_favorite && (
                            <Heart className="size-3.5 fill-red-500 text-red-500" />
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {r.perServing.kcal} kcal/porción · P{" "}
                          {r.perServing.protein_g} · C {r.perServing.carbs_g} · G{" "}
                          {r.perServing.fat_g} g · {r.servings} porc.
                        </p>
                      </div>
                      {r.image_url && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={r.image_url}
                          alt={r.title}
                          className="size-14 shrink-0 rounded-lg object-cover"
                        />
                      )}
                    </div>
                    {r.tags && r.tags.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {r.tags.map((t) => (
                          <span
                            key={t}
                            className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                          >
                            {RECIPE_TAG_LABELS[t] ?? t}
                          </span>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
