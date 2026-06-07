import type { Metadata } from "next";
import { UtensilsCrossed } from "lucide-react";
import { ModulePlaceholder } from "@/components/module-placeholder";

export const metadata: Metadata = { title: "Recetas · Vital360" };

export default function RecetasPage() {
  return (
    <ModulePlaceholder
      icon={UtensilsCrossed}
      title="Recetas"
      description="Pronto: guarda recetas con macros por porción y pide ideas dentro de tus macros restantes."
    />
  );
}
