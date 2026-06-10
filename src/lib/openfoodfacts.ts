import "server-only";

import type { OffDraft } from "@/lib/types";

/**
 * Integración con Open Food Facts (gratis, sin API key).
 * Devuelve "borradores" de alimento con macros POR 100 g (serving_g = 100),
 * listos para importarse a la tabla `foods`.
 */

const UA = "Vital360/1.0 (https://vital360-rho.vercel.app)";

/* eslint-disable @typescript-eslint/no-explicit-any */
function mapProduct(p: any): OffDraft | null {
  const n = p?.nutriments ?? {};
  const kcal = Number(n["energy-kcal_100g"]);
  const name = (p?.product_name ?? "").trim();
  if (!name || !Number.isFinite(kcal) || kcal <= 0) return null;
  const num = (v: any) => (Number.isFinite(Number(v)) ? Number(v) : 0);
  return {
    name: name.slice(0, 120),
    // Primera marca de la lista separada por comas.
    brand: String(p?.brands ?? "").split(",")[0].trim().slice(0, 120),
    serving_g: 100,
    kcal: Math.round(kcal),
    protein_g: Math.round(num(n.proteins_100g) * 10) / 10,
    carbs_g: Math.round(num(n.carbohydrates_100g) * 10) / 10,
    fat_g: Math.round(num(n.fat_100g) * 10) / 10,
    fiber_g:
      n.fiber_100g != null && Number.isFinite(Number(n.fiber_100g))
        ? Math.round(Number(n.fiber_100g) * 10) / 10
        : null,
    code: String(p?.code ?? ""),
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

/** Busca alimentos por texto. */
export async function searchOff(query: string): Promise<OffDraft[]> {
  const url =
    "https://world.openfoodfacts.org/cgi/search.pl?search_terms=" +
    encodeURIComponent(query) +
    "&search_simple=1&json=1&page_size=12&fields=code,product_name,brands,nutriments";
  try {
    const r = await fetch(url, { headers: { "User-Agent": UA } });
    if (!r.ok) return [];
    const j = await r.json();
    const seen = new Set<string>();
    const out: OffDraft[] = [];
    for (const p of j.products ?? []) {
      const d = mapProduct(p);
      if (!d) continue;
      const key = `${d.name}|${d.brand}`.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(d);
      if (out.length >= 8) break;
    }
    return out;
  } catch (e) {
    console.error("OFF search:", e);
    return [];
  }
}

/** Busca un producto por código de barras. */
export async function lookupBarcode(code: string): Promise<OffDraft | null> {
  const clean = code.replace(/\D/g, "");
  if (!clean) return null;
  const url =
    "https://world.openfoodfacts.org/api/v2/product/" +
    clean +
    ".json?fields=code,product_name,brands,nutriments";
  try {
    const r = await fetch(url, { headers: { "User-Agent": UA } });
    if (!r.ok) return null;
    const j = await r.json();
    if (j.status !== 1 || !j.product) return null;
    return mapProduct(j.product);
  } catch (e) {
    console.error("OFF barcode:", e);
    return null;
  }
}
