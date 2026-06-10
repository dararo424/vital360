import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { getWorkout, requireOnboarded } from "@/lib/dal";
import { WorkoutEditor } from "../../workout-editor";

export const metadata: Metadata = { title: "Editar entreno · Vital360" };

export default async function EditarEntrenoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireOnboarded();
  const { id } = await params;
  const workout = await getWorkout(id);
  if (!workout) notFound();

  return (
    <div className="space-y-4">
      <Link
        href="/entrenos"
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" /> Entrenos
      </Link>
      <h1 className="text-2xl font-semibold tracking-tight">Editar entreno</h1>
      <WorkoutEditor editId={id} initial={workout} />
    </div>
  );
}
