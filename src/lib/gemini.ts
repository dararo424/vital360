import "server-only";

import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";

/**
 * Análisis de foto de comida con Gemini Vision.
 * El conteo es una ESTIMACIÓN de apoyo (principio Vital360): el usuario edita
 * todo antes de guardar. Por eso pedimos también un `confidence` por ítem.
 */

const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

const PROMPT = `Eres un asistente de nutrición. Identifica cada alimento visible en la foto.
Para cada alimento estima su cantidad en gramos y sus macros.
Responde SOLO con JSON (sin markdown) con este formato exacto:
{ "items": [ { "name": string, "estimated_grams": number, "kcal": number, "protein_g": number, "carbs_g": number, "fat_g": number, "confidence": number } ] }
Reglas:
- "name" en español, conciso (ej. "Arroz blanco", "Pechuga de pollo a la plancha").
- Las cantidades y macros son ESTIMACIONES. Si no estás seguro, baja el "confidence".
- "confidence" entre 0 y 1.
- Si no se ve comida, devuelve { "items": [] }.`;

const responseSchema = {
  type: SchemaType.OBJECT,
  properties: {
    items: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          name: { type: SchemaType.STRING },
          estimated_grams: { type: SchemaType.NUMBER },
          kcal: { type: SchemaType.NUMBER },
          protein_g: { type: SchemaType.NUMBER },
          carbs_g: { type: SchemaType.NUMBER },
          fat_g: { type: SchemaType.NUMBER },
          confidence: { type: SchemaType.NUMBER },
        },
        required: [
          "name",
          "estimated_grams",
          "kcal",
          "protein_g",
          "carbs_g",
          "fat_g",
          "confidence",
        ],
      },
    },
  },
  required: ["items"],
};

/**
 * Llama a Gemini con la imagen y devuelve el texto crudo (JSON) de la respuesta.
 * El parseo/validación con zod se hace en el caller (Server Action).
 */
export async function analyzeImageRaw(
  base64: string,
  mimeType: string
): Promise<string> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY no configurada");

  const genAI = new GoogleGenerativeAI(key);
  const model = genAI.getGenerativeModel({
    model: MODEL,
    generationConfig: {
      responseMimeType: "application/json",
      // @ts-expect-error responseSchema acepta este shape en runtime
      responseSchema,
      temperature: 0.2,
    },
  });

  const result = await model.generateContent([
    PROMPT,
    { inlineData: { mimeType, data: base64 } },
  ]);

  return result.response.text();
}

const recipeResponseSchema = {
  type: SchemaType.OBJECT,
  properties: {
    title: { type: SchemaType.STRING },
    servings: { type: SchemaType.INTEGER },
    prep_minutes: { type: SchemaType.INTEGER },
    instructions: { type: SchemaType.STRING },
    tags: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
    ingredients: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          name: { type: SchemaType.STRING },
          quantity_g: { type: SchemaType.NUMBER },
          kcal: { type: SchemaType.NUMBER },
          protein_g: { type: SchemaType.NUMBER },
          carbs_g: { type: SchemaType.NUMBER },
          fat_g: { type: SchemaType.NUMBER },
        },
        required: ["name", "quantity_g", "kcal", "protein_g", "carbs_g", "fat_g"],
      },
    },
  },
  required: ["title", "servings", "instructions", "ingredients", "tags"],
};

/**
 * Sugiere una receta que encaje en los macros restantes del día.
 * Devuelve el texto crudo (JSON); el caller valida con zod.
 */
export async function suggestRecipeRaw(
  remaining: { kcal: number; protein_g: number; carbs_g: number; fat_g: number },
  notes?: string
): Promise<string> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY no configurada");

  const prompt = `Eres un asistente de nutrición. Propón UNA receta sencilla y realista que ENCAJE dentro de estos macros restantes del día (no los excedas significativamente):
- Calorías: ${remaining.kcal} kcal
- Proteína: ${remaining.protein_g} g
- Carbohidratos: ${remaining.carbs_g} g
- Grasa: ${remaining.fat_g} g
${notes ? `Preferencias del usuario: ${notes}` : ""}
Responde SOLO JSON (sin markdown) con: title (string, español), servings (entero), prep_minutes (entero), instructions (pasos en español, texto), tags (array de strings cortos en español), ingredients (array de { name, quantity_g, kcal, protein_g, carbs_g, fat_g }).
Los macros de cada ingrediente son para su quantity_g indicado. La suma de los ingredientes, dividida entre servings, debe acercarse a los macros objetivo. Usa ingredientes comunes y cantidades realistas.`;

  const genAI = new GoogleGenerativeAI(key);
  const model = genAI.getGenerativeModel({
    model: MODEL,
    generationConfig: {
      responseMimeType: "application/json",
      // @ts-expect-error responseSchema acepta este shape en runtime
      responseSchema: recipeResponseSchema,
      temperature: 0.7,
    },
  });

  const result = await model.generateContent(prompt);
  return result.response.text();
}

const ingredientSchema = {
  type: SchemaType.OBJECT,
  properties: {
    name: { type: SchemaType.STRING },
    quantity_g: { type: SchemaType.NUMBER },
    kcal: { type: SchemaType.NUMBER },
    protein_g: { type: SchemaType.NUMBER },
    carbs_g: { type: SchemaType.NUMBER },
    fat_g: { type: SchemaType.NUMBER },
  },
  required: ["name", "quantity_g", "kcal", "protein_g", "carbs_g", "fat_g"],
};

const planResponseSchema = {
  type: SchemaType.OBJECT,
  properties: {
    summary: { type: SchemaType.STRING },
    training: {
      type: SchemaType.OBJECT,
      properties: {
        days_per_week: { type: SchemaType.INTEGER },
        focus: { type: SchemaType.STRING },
        sessions: {
          type: SchemaType.ARRAY,
          items: {
            type: SchemaType.OBJECT,
            properties: {
              name: { type: SchemaType.STRING },
              focus: { type: SchemaType.STRING },
              exercises: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
            },
            required: ["name", "focus", "exercises"],
          },
        },
      },
      required: ["days_per_week", "focus", "sessions"],
    },
    habit_tips: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
    craving_busters: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          craving: { type: SchemaType.STRING },
          swap: { type: SchemaType.STRING },
        },
        required: ["craving", "swap"],
      },
    },
    recipes: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          title: { type: SchemaType.STRING },
          servings: { type: SchemaType.INTEGER },
          kcal_per_serving: { type: SchemaType.NUMBER },
          protein_g: { type: SchemaType.NUMBER },
          carbs_g: { type: SchemaType.NUMBER },
          fat_g: { type: SchemaType.NUMBER },
          ingredients: { type: SchemaType.ARRAY, items: ingredientSchema },
          steps: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
          video_search: { type: SchemaType.STRING },
        },
        required: [
          "title", "servings", "kcal_per_serving", "protein_g", "carbs_g",
          "fat_g", "ingredients", "steps", "video_search",
        ],
      },
    },
  },
  required: ["summary", "training", "habit_tips", "craving_busters", "recipes"],
};

/**
 * Genera un plan personalizado (entreno + hábitos + recetas anti-antojo) a
 * partir del perfil del usuario y el estimado calórico ya calculado por fórmula.
 * Las calorías/macros las define la fórmula; la IA solo personaliza el plan.
 */
export async function generatePlanRaw(profileBrief: string): Promise<string> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY no configurada");

  const prompt = `Eres un coach de nutrición y entrenamiento. Con el perfil del usuario, crea un plan PERSONALIZADO, realista y saludable. NO cambies las calorías ni macros objetivo (ya están calculados por fórmula médica); respétalos.

${profileBrief}

Responde SOLO JSON (sin markdown) con:
- summary: 2-3 frases motivadoras y realistas sobre su plan (en español, tuteando). Si la meta es muy ambiciosa, sé honesto sobre que es gradual.
- training: { days_per_week (entero), focus (texto), sessions: [{ name, focus, exercises: [string] }] } acorde a su objetivo, días disponibles y lugar (casa/gym). Si quiere cuidar músculo/piel, prioriza fuerza.
- habit_tips: 4-6 consejos concretos según sus hábitos y dónde falla.
- craving_busters: para CADA antojo que mencionó, un objeto { craving, swap } con una alternativa saludable que calme ese antojo.
- recipes: 3 recetas que encajen en sus macros y ataquen sus antojos (ej. versiones saludables de frituras/dulces). Cada receta: title, servings, kcal_per_serving, protein_g, carbs_g, fat_g, ingredients [{name, quantity_g, kcal, protein_g, carbs_g, fat_g}], steps (pasos claros en español), video_search (texto para buscar la preparación en YouTube). Respeta alergias y alimentos que no le gustan.`;

  const genAI = new GoogleGenerativeAI(key);
  const model = genAI.getGenerativeModel({
    model: MODEL,
    generationConfig: {
      responseMimeType: "application/json",
      // @ts-expect-error responseSchema acepta este shape en runtime
      responseSchema: planResponseSchema,
      temperature: 0.6,
    },
  });

  const result = await model.generateContent(prompt);
  return result.response.text();
}

/** Quita fences de markdown por si el modelo los añade pese al responseMimeType. */
export function stripJsonFences(text: string): string {
  return text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();
}
