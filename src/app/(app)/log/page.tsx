import type { Metadata } from "next";
import { PlusCircle } from "lucide-react";
import { ModulePlaceholder } from "@/components/module-placeholder";

export const metadata: Metadata = { title: "Registrar · Vital360" };

export default function LogPage() {
  return (
    <ModulePlaceholder
      icon={PlusCircle}
      title="Registrar comida"
      description="Pronto: foto con conteo por IA (estimación editable) o búsqueda manual de alimentos."
    />
  );
}
