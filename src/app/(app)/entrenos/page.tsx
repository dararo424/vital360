import type { Metadata } from "next";
import { Dumbbell } from "lucide-react";
import { ModulePlaceholder } from "@/components/module-placeholder";

export const metadata: Metadata = { title: "Entrenos · Vital360" };

export default function EntrenosPage() {
  return (
    <ModulePlaceholder
      icon={Dumbbell}
      title="Entrenos"
      description="Pronto: registra fuerza (sets/reps/peso) y cardio, con historial y récords por ejercicio."
    />
  );
}
