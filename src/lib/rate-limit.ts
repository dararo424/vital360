import "server-only";

import { createClient } from "@/lib/supabase/server";
import { getUser, today } from "@/lib/dal";

/**
 * Rate-limiting de IA por usuario y día (cuota de Gemini compartida).
 * Conteo simple en la tabla ai_usage. Para pocos usuarios la condición de
 * carrera del read+upsert es despreciable.
 */

export type AiKind = "analyze" | "plan" | "recipe" | "image" | "grocery";

// Límite diario por usuario, por tipo de acción.
const LIMITS: Record<AiKind, number> = {
  analyze: 30, // conteo por foto
  plan: 6, // generar/regenerar plan
  recipe: 15, // sugerir receta
  image: 10, // foto IA del plato (gasta créditos)
  grocery: 8, // lista de mercado con IA
};

export const AI_LIMIT_MESSAGE: Record<AiKind, string> = {
  analyze: "Llegaste al límite diario de análisis por foto. Intenta mañana o usa el registro manual.",
  plan: "Llegaste al límite diario para generar planes con IA. Intenta mañana.",
  recipe: "Llegaste al límite diario de sugerencias de receta. Intenta mañana.",
  image: "Llegaste al límite diario de fotos generadas con IA. Intenta mañana.",
  grocery: "Límite diario de generación con IA alcanzado.",
};

/**
 * Verifica e incrementa el uso. Devuelve { ok:false } si se superó el límite.
 * Llamar ANTES de la llamada a Gemini.
 */
export async function checkAiLimit(
  kind: AiKind
): Promise<{ ok: boolean; error?: string }> {
  const user = await getUser();
  if (!user) return { ok: false, error: "Sesión expirada." };

  const supabase = await createClient();
  const day = today();
  const { data } = await supabase
    .from("ai_usage")
    .select("count")
    .eq("user_id", user.id)
    .eq("day", day)
    .eq("kind", kind)
    .maybeSingle();

  const count = (data?.count as number) ?? 0;
  if (count >= LIMITS[kind]) {
    return { ok: false, error: AI_LIMIT_MESSAGE[kind] };
  }

  await supabase
    .from("ai_usage")
    .upsert(
      { user_id: user.id, day, kind, count: count + 1 },
      { onConflict: "user_id,day,kind" }
    );
  return { ok: true };
}

/** ¿El error de Gemini es por cuota agotada (429 / RESOURCE_EXHAUSTED)? */
export function isQuotaError(e: unknown): boolean {
  const msg = String((e as { message?: string })?.message ?? e ?? "");
  return /429|quota|RESOURCE_EXHAUSTED|prepayment/i.test(msg);
}
