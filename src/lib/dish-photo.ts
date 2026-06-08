import "server-only";

import { generateDishImage } from "@/lib/gemini";

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Genera la foto del plato y la sube al bucket `recipe-photos`.
 * Devuelve la URL pública, o null si la generación/subida falla.
 * `pathKey` define el nombre del archivo (con upsert, así regenerar reemplaza).
 */
export async function generateAndUploadDishPhoto(
  supabase: any,
  userId: string,
  title: string,
  ingredients: string[],
  pathKey: string
): Promise<string | null> {
  const img = await generateDishImage(title, ingredients);
  if (!img) return null;

  const ext = img.mimeType.includes("jpeg") ? "jpg" : "png";
  const path = `${userId}/${pathKey}.${ext}`;
  const buffer = Buffer.from(img.data, "base64");

  const { error } = await supabase.storage
    .from("recipe-photos")
    .upload(path, buffer, { contentType: img.mimeType, upsert: true });
  if (error) {
    console.error("subida de foto:", error.message);
    return null;
  }

  const { data } = supabase.storage.from("recipe-photos").getPublicUrl(path);
  // Cache-busting para que el navegador no muestre una versión vieja al regenerar.
  return `${data.publicUrl}?v=${Date.now()}`;
}
