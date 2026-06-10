"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getUser, today } from "@/lib/dal";

/** Guarda la fila de una foto de progreso ya subida a Storage. */
export async function saveProgressPhoto(
  imagePath: string,
  note: string
): Promise<{ ok: boolean; error?: string }> {
  const user = await getUser();
  if (!user) return { ok: false, error: "Sesión expirada." };
  if (!imagePath.startsWith(`${user.id}/`)) {
    return { ok: false, error: "Ruta inválida." };
  }
  const supabase = await createClient();
  const { error } = await supabase.from("progress_photos").insert({
    user_id: user.id,
    image_path: imagePath,
    taken_on: today(),
    note: note.trim() || null,
  });
  if (error) return { ok: false, error: "No se pudo guardar la foto." };
  revalidatePath("/progreso");
  return { ok: true };
}

/** Borra una foto de progreso (fila + objeto en Storage). */
export async function deleteProgressPhoto(id: string): Promise<void> {
  const user = await getUser();
  if (!user) return;
  const supabase = await createClient();
  const { data: row } = await supabase
    .from("progress_photos")
    .select("image_path")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (row?.image_path) {
    await supabase.storage.from("progress-photos").remove([row.image_path]);
  }
  await supabase.from("progress_photos").delete().eq("id", id).eq("user_id", user.id);
  revalidatePath("/progreso");
}
