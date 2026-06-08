import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getRemainingMacros, requireOnboarded } from "@/lib/dal";
import { RecipeEditor } from "../recipe-editor";

export const metadata: Metadata = { title: "Nueva receta · Vital360" };

export default async function NuevaRecetaPage() {
  await requireOnboarded();
  const remaining = await getRemainingMacros();

  return (
    <div className="space-y-4">
      <Link
        href="/recetas"
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" /> Recetas
      </Link>
      <h1 className="text-2xl font-semibold tracking-tight">Nueva receta</h1>
      <RecipeEditor remaining={remaining} />
    </div>
  );
}
