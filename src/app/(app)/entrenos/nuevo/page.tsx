import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getTemplate, getUser, requireOnboarded } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import { WorkoutEditor, type WorkoutPrefill } from "../workout-editor";

export const metadata: Metadata = { title: "Nuevo entreno · Vital360" };

/** Convierte una plantilla guardada en bloques precargados. */
async function prefillFromTemplate(id: string): Promise<WorkoutPrefill | undefined> {
  const tpl = await getTemplate(id);
  if (!tpl || tpl.items.length === 0) return undefined;
  return {
    title: tpl.name,
    blocks: tpl.items.map((it) => ({
      exercise_id: it.exercise_id,
      name: it.name,
      type: it.type as WorkoutPrefill["blocks"][number]["type"],
      sets: it.sets,
    })),
  };
}

/* eslint-disable @typescript-eslint/no-explicit-any */
/** Convierte una sesión del plan IA en bloques precargados (crea/encuentra ejercicios). */
async function prefillFromPlan(index: number): Promise<WorkoutPrefill | undefined> {
  const user = await getUser();
  if (!user) return undefined;

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("plan")
    .eq("id", user.id)
    .maybeSingle();
  const session = (profile as any)?.plan?.training?.sessions?.[index];
  if (!session?.exercises?.length) return undefined;

  const isCardio = /cardio/i.test(session.focus ?? "");
  const blocks: WorkoutPrefill["blocks"] = [];

  for (const raw of session.exercises as string[]) {
    // "Press de banca (4 series x 8 reps)" → nombre + nº de series.
    const name = raw.split("(")[0].trim().slice(0, 120) || raw.slice(0, 120);
    const sets = Number(raw.match(/(\d+)\s*series/i)?.[1]) || 3;
    const type = isCardio ? "cardio" : "fuerza";

    // Busca el ejercicio en el catálogo del usuario; si no existe, lo crea.
    const { data: found } = await supabase
      .from("exercises")
      .select("id")
      .eq("user_id", user.id)
      .ilike("name", name)
      .limit(1);
    let id = found?.[0]?.id as string | undefined;
    if (!id) {
      const { data: created } = await supabase
        .from("exercises")
        .insert({ user_id: user.id, name, type })
        .select("id")
        .single();
      id = created?.id;
    }
    if (id) blocks.push({ exercise_id: id, name, type, sets });
  }

  if (!blocks.length) return undefined;
  return { title: session.name ?? "Entreno del plan", blocks };
}

export default async function NuevoEntrenoPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string; template?: string }>;
}) {
  await requireOnboarded();
  const { plan, template } = await searchParams;
  const prefill = template
    ? await prefillFromTemplate(template)
    : plan != null && !Number.isNaN(Number(plan))
      ? await prefillFromPlan(Number(plan))
      : undefined;

  return (
    <div className="space-y-4">
      <Link
        href={prefill ? "/mi-plan" : "/entrenos"}
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" /> {prefill ? "Tu plan" : "Entrenos"}
      </Link>
      <h1 className="text-2xl font-semibold tracking-tight">
        {prefill ? prefill.title : "Nuevo entreno"}
      </h1>
      {prefill && (
        <p className="text-sm text-muted-foreground">
          Ejercicios precargados de tu plan. Completa peso y reps de cada serie.
        </p>
      )}
      <WorkoutEditor prefill={prefill} />
    </div>
  );
}
