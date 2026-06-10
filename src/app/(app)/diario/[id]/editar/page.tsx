import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { getFoodLog, requireOnboarded } from "@/lib/dal";
import { EditMealForm } from "../../edit-meal-form";

export const metadata: Metadata = { title: "Editar comida · Vital360" };

export default async function EditarComidaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireOnboarded();
  const { id } = await params;
  const log = await getFoodLog(id);
  if (!log) notFound();

  return (
    <div className="space-y-4">
      <Link
        href={`/diario?date=${log.log_date.slice(0, 10)}`}
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" /> Volver al diario
      </Link>
      <h1 className="text-2xl font-semibold tracking-tight">Editar comida</h1>
      <EditMealForm log={log} />
    </div>
  );
}
