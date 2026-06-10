"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/dal";
import {
  exerciseSchema,
  workoutSchema,
  type ActionState,
  type Exercise,
  type ExerciseInput,
  type WorkoutInput,
} from "@/lib/types";

/** Guarda un entreno como plantilla reutilizable (ejercicios + nº de series). */
export async function saveWorkoutAsTemplate(
  workoutId: string
): Promise<{ ok: boolean; error?: string }> {
  const user = await getUser();
  if (!user) return { ok: false, error: "Sesión expirada." };
  const supabase = await createClient();

  const { data: w } = await supabase
    .from("workouts")
    .select("title,workout_sets(exercise_id)")
    .eq("id", workoutId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!w) return { ok: false, error: "Entreno no encontrado." };

  const counts = new Map<string, number>();
  for (const s of (w as { workout_sets?: { exercise_id: string }[] }).workout_sets ?? []) {
    counts.set(s.exercise_id, (counts.get(s.exercise_id) ?? 0) + 1);
  }
  if (counts.size === 0) return { ok: false, error: "El entreno no tiene ejercicios." };

  const { data: tpl, error: tErr } = await supabase
    .from("workout_templates")
    .insert({ user_id: user.id, name: (w as { title: string }).title || "Plantilla" })
    .select("id")
    .single();
  if (tErr || !tpl) return { ok: false, error: "No se pudo crear la plantilla." };

  const { error: iErr } = await supabase.from("workout_template_items").insert(
    [...counts.entries()].map(([exercise_id, sets], i) => ({
      template_id: tpl.id,
      exercise_id,
      sets,
      position: i,
    }))
  );
  if (iErr) {
    await supabase.from("workout_templates").delete().eq("id", tpl.id);
    return { ok: false, error: "No se pudieron guardar los ejercicios." };
  }

  revalidatePath("/entrenos");
  return { ok: true };
}

/** Borra una plantilla de entreno. */
export async function deleteTemplate(id: string): Promise<void> {
  const user = await getUser();
  if (!user) return;
  const supabase = await createClient();
  await supabase.from("workout_templates").delete().eq("id", id).eq("user_id", user.id);
  revalidatePath("/entrenos");
}

/** Crea un ejercicio en el catálogo del usuario y lo devuelve. */
export async function createExercise(
  input: ExerciseInput
): Promise<{ ok: true; exercise: Exercise } | { ok: false; error: string }> {
  const user = await getUser();
  if (!user) return { ok: false, error: "Sesión expirada." };

  const parsed = exerciseSchema.safeParse(input);
  if (!parsed.success) {
    const first =
      Object.values(z.flattenError(parsed.error).fieldErrors)[0]?.[0] ??
      "Datos inválidos.";
    return { ok: false, error: first };
  }
  const d = parsed.data;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("exercises")
    .insert({
      user_id: user.id,
      name: d.name,
      type: d.type,
      muscle_group: d.muscle_group || null,
    })
    .select("*")
    .single();

  if (error || !data) return { ok: false, error: "No se pudo crear el ejercicio." };
  return { ok: true, exercise: data as Exercise };
}

/** Guarda un entreno (workouts) con sus series (workout_sets). */
export async function logWorkout(input: WorkoutInput): Promise<ActionState> {
  const user = await getUser();
  if (!user) return { ok: false, error: "Sesión expirada." };

  const parsed = workoutSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Revisa los datos del entreno.",
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
    };
  }
  const d = parsed.data;
  const supabase = await createClient();

  const { data: workout, error: wErr } = await supabase
    .from("workouts")
    .insert({
      user_id: user.id,
      title: d.title,
      workout_date: d.workout_date,
      duration_min: d.duration_min ?? null,
      note: d.note || null,
    })
    .select("id")
    .single();

  if (wErr || !workout) return { ok: false, error: "No se pudo guardar el entreno." };

  const { error: sErr } = await supabase.from("workout_sets").insert(
    d.sets.map((s) => ({
      workout_id: workout.id,
      exercise_id: s.exercise_id,
      set_number: s.set_number,
      reps: s.reps ?? null,
      weight_kg: s.weight_kg ?? null,
      duration_sec: s.duration_sec ?? null,
      distance_m: s.distance_m ?? null,
      rpe: s.rpe ?? null,
    }))
  );

  if (sErr) {
    await supabase.from("workouts").delete().eq("id", workout.id);
    return { ok: false, error: "No se pudieron guardar las series." };
  }

  revalidatePath("/entrenos");
  redirect("/entrenos");
}

/** Edita un entreno: actualiza la cabecera y reemplaza las series. */
export async function updateWorkout(
  id: string,
  input: WorkoutInput
): Promise<ActionState> {
  const user = await getUser();
  if (!user) return { ok: false, error: "Sesión expirada." };

  const parsed = workoutSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Revisa los datos del entreno.",
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
    };
  }
  const d = parsed.data;
  const supabase = await createClient();

  const { error: wErr } = await supabase
    .from("workouts")
    .update({
      title: d.title,
      workout_date: d.workout_date,
      duration_min: d.duration_min ?? null,
      note: d.note || null,
    })
    .eq("id", id)
    .eq("user_id", user.id);
  if (wErr) return { ok: false, error: "No se pudo actualizar el entreno." };

  await supabase.from("workout_sets").delete().eq("workout_id", id);
  const { error: sErr } = await supabase.from("workout_sets").insert(
    d.sets.map((s) => ({
      workout_id: id,
      exercise_id: s.exercise_id,
      set_number: s.set_number,
      reps: s.reps ?? null,
      weight_kg: s.weight_kg ?? null,
      duration_sec: s.duration_sec ?? null,
      distance_m: s.distance_m ?? null,
      rpe: s.rpe ?? null,
    }))
  );
  if (sErr) return { ok: false, error: "No se pudieron guardar las series." };

  revalidatePath("/entrenos");
  redirect("/entrenos");
}

export async function deleteWorkout(id: string): Promise<void> {
  const user = await getUser();
  if (!user) return;
  const supabase = await createClient();
  await supabase.from("workout_sets").delete().eq("workout_id", id);
  await supabase.from("workouts").delete().eq("id", id).eq("user_id", user.id);
  revalidatePath("/entrenos");
}
