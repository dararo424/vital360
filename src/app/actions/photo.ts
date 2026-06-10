"use server";

import { analyzeImageRaw, stripJsonFences } from "@/lib/gemini";
import { getUser } from "@/lib/dal";
import { checkAiLimit, isQuotaError } from "@/lib/rate-limit";
import { analyzeResultSchema, type AnalyzedItem } from "@/lib/types";

type AnalyzeResult =
  | { ok: true; items: AnalyzedItem[]; raw: unknown }
  | { ok: false; error: string };

/**
 * Analiza una foto de comida con Gemini Vision y devuelve ítems estimados
 * para que el usuario los EDITE antes de guardar. Ante cualquier fallo,
 * devuelve un error legible y el caller cae al registro manual.
 */
export async function analyzeMealPhoto(
  imageBase64: string,
  mimeType: string
): Promise<AnalyzeResult> {
  const user = await getUser();
  if (!user) return { ok: false, error: "Sesión expirada. Inicia sesión." };

  if (!imageBase64 || !mimeType.startsWith("image/")) {
    return { ok: false, error: "Imagen inválida." };
  }

  const lim = await checkAiLimit("analyze");
  if (!lim.ok) return { ok: false, error: lim.error! };

  let rawText: string;
  try {
    rawText = await analyzeImageRaw(imageBase64, mimeType);
  } catch (e) {
    console.error("Gemini error:", e);
    return {
      ok: false,
      error: isQuotaError(e)
        ? "La IA está sin cuota por ahora. Intenta más tarde o usa el registro manual."
        : "No se pudo analizar la foto. Usa el registro manual.",
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(stripJsonFences(rawText));
  } catch {
    return {
      ok: false,
      error: "La IA devolvió un formato inesperado. Usa el registro manual.",
    };
  }

  const result = analyzeResultSchema.safeParse(parsed);
  if (!result.success) {
    return {
      ok: false,
      error: "La IA devolvió datos incompletos. Usa el registro manual.",
    };
  }

  if (result.data.items.length === 0) {
    return {
      ok: false,
      error: "No detecté comida en la foto. Prueba otra o usa el manual.",
    };
  }

  // Guardamos el JSON crudo parseado para persistirlo en food_logs.ai_raw.
  return { ok: true, items: result.data.items, raw: result.data };
}
