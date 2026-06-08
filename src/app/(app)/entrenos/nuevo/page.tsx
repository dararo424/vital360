import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { requireOnboarded } from "@/lib/dal";
import { WorkoutEditor } from "../workout-editor";

export const metadata: Metadata = { title: "Nuevo entreno · Vital360" };

export default async function NuevoEntrenoPage() {
  await requireOnboarded();

  return (
    <div className="space-y-4">
      <Link
        href="/entrenos"
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" /> Entrenos
      </Link>
      <h1 className="text-2xl font-semibold tracking-tight">Nuevo entreno</h1>
      <WorkoutEditor />
    </div>
  );
}
