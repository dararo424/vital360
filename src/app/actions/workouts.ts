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

export async function deleteWorkout(id: string): Promise<void> {
  const user = await getUser();
  if (!user) return;
  const supabase = await createClient();
  await supabase.from("workout_sets").delete().eq("workout_id", id);
  await supabase.from("workouts").delete().eq("id", id).eq("user_id", user.id);
  revalidatePath("/entrenos");
}
