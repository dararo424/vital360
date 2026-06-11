"use server";

import { z } from "zod";
import { getWeekFoodSummary } from "@/lib/dal";
import { nutritionInsightRaw, stripJsonFences } from "@/lib/gemini";
import { checkAiLimit, isQuotaError } from "@/lib/rate-limit";

const schema = z.object({ summary: z.string(), tips: z.array(z.string()) });

export type NutritionInsight = { summary: string; tips: string[] };

/** Analiza lo comido en la semana vs las metas y devuelve consejos con IA. */
export async function analyzeNutrition(): Promise<
  { ok: true; insight: NutritionInsight; daysLogged: number } | { ok: false; error: string }
> {
  const s = await getWeekFoodSummary();
  if (!s.goal) return { ok: false, error: "Necesitas una meta de nutrición vigente." };
  if (s.daysLogged === 0 || s.foods.length === 0 || !s.avg)
    return { ok: false, error: "Registra al menos un día de comidas para poder analizar." };

  const lim = await checkAiLimit("insight");
  if (!lim.ok) return { ok: false, error: lim.error! };

  const brief = [
    `Metas diarias: ${s.goal.kcal} kcal, proteína ${s.goal.protein_g} g, carbohidratos ${s.goal.carbs_g} g, grasa ${s.goal.fat_g} g.`,
    `Consumo promedio diario (${s.daysLogged} día(s) registrados): ${s.avg.kcal} kcal, P ${s.avg.protein_g} g, C ${s.avg.carbs_g} g, G ${s.avg.fat_g} g.`,
    `Alimentos de la semana (nombre ×veces — totales kcal/P/C/G):`,
    ...s.foods.map(
      (f) =>
        `- ${f.name} ×${f.occurrences}: ${f.kcal} kcal, P ${Math.round(f.protein_g)} C ${Math.round(
          f.carbs_g
        )} G ${Math.round(f.fat_g)}`
    ),
  ].join("\n");

  try {
    const raw = await nutritionInsightRaw(brief);
    const parsed = schema.safeParse(JSON.parse(stripJsonFences(raw)));
    if (!parsed.success || !parsed.data.tips.length)
      return { ok: false, error: "No se pudo analizar. Intenta de nuevo." };
    return {
      ok: true,
      daysLogged: s.daysLogged,
      insight: { summary: parsed.data.summary, tips: parsed.data.tips.slice(0, 4) },
    };
  } catch (e) {
    return {
      ok: false,
      error: isQuotaError(e)
        ? "La IA está sin cuota por ahora. Intenta más tarde."
        : "No se pudo analizar. Intenta de nuevo.",
    };
  }
}
