"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getRemainingMacros, getUser } from "@/lib/dal";
import { CRAVINGS, FAIL_MEALS } from "@/lib/nutrition-plan";
import { antiCravingRaw, stripJsonFences } from "@/lib/gemini";
import { checkAiLimit, isQuotaError } from "@/lib/rate-limit";

const schema = z.object({
  message: z.string(),
  options: z.array(
    z.object({ kind: z.string(), title: z.string(), detail: z.string() })
  ),
});

export type CravingHelp = z.infer<typeof schema>;

/** Ayuda anti-antojo en el momento, personalizada con el perfil + lo que queda hoy. */
export async function getAntiCravingHelp(
  craving: string,
  reason?: string
): Promise<{ ok: true; help: CravingHelp } | { ok: false; error: string }> {
  const user = await getUser();
  if (!user) return { ok: false, error: "Sesión expirada." };
  const c = craving.trim();
  if (!c) return { ok: false, error: "Dime qué se te antoja." };

  const lim = await checkAiLimit("craving");
  if (!lim.ok) return { ok: false, error: lim.error! };

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarding")
    .eq("id", user.id)
    .maybeSingle();
  const onb = (profile?.onboarding ?? {}) as {
    cravings?: string[];
    fail_meal?: string[];
  };
  const cravingLabels = (onb.cravings ?? []).map(
    (k) => (CRAVINGS as Record<string, string>)[k] ?? k
  );
  const failLabels = (onb.fail_meal ?? []).map(
    (k) => (FAIL_MEALS as Record<string, string>)[k] ?? k
  );
  const remaining = await getRemainingMacros();

  const brief = [
    `Antojo ahora mismo: ${c}.`,
    reason ? `Posible motivo: ${reason}.` : "",
    `Antojos habituales del usuario: ${cravingLabels.join(", ") || "no especificados"}.`,
    `Donde mas suele fallar: ${failLabels.join(", ") || "no especificado"}.`,
    remaining
      ? `Calorias que le quedan hoy: ${Math.round(remaining.kcal)} kcal (P ${Math.round(
          remaining.protein_g
        )} C ${Math.round(remaining.carbs_g)} G ${Math.round(remaining.fat_g)}).`
      : "Calorias restantes: no disponible.",
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const raw = await antiCravingRaw(brief);
    const parsed = schema.safeParse(JSON.parse(stripJsonFences(raw)));
    if (!parsed.success || !parsed.data.options.length)
      return { ok: false, error: "No pude generar ayuda. Intenta de nuevo." };
    return {
      ok: true,
      help: { message: parsed.data.message, options: parsed.data.options.slice(0, 3) },
    };
  } catch (e) {
    return {
      ok: false,
      error: isQuotaError(e)
        ? "La IA está sin cuota por ahora. Intenta más tarde."
        : "No pude generar ayuda. Intenta de nuevo.",
    };
  }
}
