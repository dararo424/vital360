import type { Metadata } from "next";
import { LineChart } from "lucide-react";
import { ModulePlaceholder } from "@/components/module-placeholder";

export const metadata: Metadata = { title: "Progreso · Vital360" };

export default function ProgresoPage() {
  return (
    <ModulePlaceholder
      icon={LineChart}
      title="Progreso"
      description="Pronto: registra peso y medidas (1 por día) y mira tu tendencia en gráficas."
    />
  );
}
