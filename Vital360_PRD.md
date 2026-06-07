# Vital360 — Plan Maestro

> App personal de nutrición + ejercicio con IA para conteo de calorías por foto,
> recetas dentro de tus macros, planificador semanal y seguimiento de progreso.
> **Stack:** Next.js 14 App Router + Supabase + Vercel + Gemini Vision.
> **Tiempo estimado:** 5–8 días con Claude Code.

---

## 0. Principio de diseño (no negociable)

**Las metas las define tu nutricionista, no la app.** Vital360 cuenta, registra
y sugiere *dentro* de los macros que tú cargas desde tu plan profesional. La app
nunca propone recortes calóricos por su cuenta ni "objetivos agresivos". El conteo
de la IA es una **estimación de apoyo**, no una medición exacta — siempre editable
a mano. Cualquier cambio de plan lo decides tú con tu nutri; la app solo lo refleja.

---

## 1. Visión

App web mobile-first (PWA) para:
- Registrar comidas por **foto** (Gemini Vision estima cal/macros ítem por ítem) o **búsqueda manual**.
- Comparar lo consumido contra tus **metas del nutricionista** (con histórico de planes).
- Guardar **recetas** con macros por porción y generar **ideas dentro de tus macros**.
- **Planificador semanal** de comidas → **lista de mercado** automática.
- Registrar **entrenos** (fuerza y cardio, sets/reps/peso) y **progreso** (peso, medidas).
- **Dashboard** con tendencia de calorías vs meta, peso y volumen de entreno.

**Diferenciadores:**
- Conteo a nivel de ítem (no solo "una comida"), igual que el OCR de recibos de Finanzas360.
- Centrado en *tu* plan real, no en un algoritmo genérico de dieta.
- Tus datos en tu Supabase, con RLS — nadie más los ve.

---

## 2. Stack técnico

| Capa | Tecnología | Notas |
|---|---|---|
| Frontend | Next.js 14 App Router + TypeScript | PWA con manifest |
| UI | Tailwind + shadcn/ui + lucide-react | Mobile-first |
| Auth | Supabase Auth (email + password) | Multi-dispositivo |
| DB | Supabase Postgres + RLS | Schema completo incluido |
| State | RSC + Server Actions | Mínimo client state |
| Forms | react-hook-form + zod | Validación |
| Charts | recharts | Tendencias |
| IA Visión | Gemini 1.5 Pro Vision (free tier) | Foto → ítems + macros |
| Storage | Supabase Storage | Fotos de comidas |
| Hosting | Vercel | Free tier alcanza |

> La parte de IA puede vivir en una **Server Action** o **Route Handler** de Next
> (no necesitas FastAPI aparte como en Automatiza360, a menos que quieras separarlo).

---

## 3. Funcionalidades del MVP completo

### 3.1 Auth y onboarding
- Email + password (Supabase Auth), multi-dispositivo.
- Wizard de 4 pasos: perfil (sexo, fecha nac., estatura, nivel actividad) → **metas del nutri** (kcal, proteína, carbo, grasa) → preferencias → listo.
- Las metas se guardan en `nutrition_goals` con `effective_from`; si el nutri ajusta el plan, cierras la anterior (`effective_to`) y creas una nueva. **Histórico intacto.**

### 3.2 Dashboard (`/dashboard`)
- Anillos/barras del día: kcal, proteína, carbo, grasa vs meta vigente.
- Tendencia 7/30 días (recharts): consumido vs meta.
- Peso actual + mini-tendencia.
- FAB "Registrar comida" (foto o manual) y "Registrar entreno".

### 3.3 Registro de comida (`/log`)
- **Foto:** subes/disparas → Gemini Vision devuelve lista de ítems con cal/macros y un `ai_confidence` por ítem → **editas antes de guardar** → se guarda en `food_logs` + `food_log_items`.
- **Manual:** buscas en `foods` (full-text en español) o creas un alimento nuevo; defines porción en gramos y calcula macros.
- Cada comida tiene `meal_type` (desayuno/almuerzo/cena/snack).

### 3.4 Recetas (`/recetas`)
- CRUD con ingredientes (`recipe_ingredients`); calcula macros **por porción** al guardar.
- Tags (alto_proteina, rápido, post_entreno…), favoritos.
- **"Sugerir receta con IA"**: pasa al modelo tus macros restantes del día + preferencias → propone una receta que encaje. Editable y guardable.

### 3.5 Planificador semanal (`/plan`)
- Grilla 7 días × comidas; arrastras recetas/alimentos a cada slot (`meal_plan_entries`).
- Suma macros estimados por día vs meta.

### 3.6 Lista de mercado (`/mercado`)
- Botón "Generar lista" desde un plan semanal → agrega ingredientes de todas las recetas, agrupa por categoría, suma cantidades (`grocery_lists` + `grocery_items`).
- Checkboxes para ir marcando en el súper.

### 3.7 Ejercicio (`/entrenos`)
- Registrar workout: título, fecha, duración; agregar ejercicios con sets/reps/peso (`workout_sets`), o cardio con duración/distancia.
- Catálogo de ejercicios reutilizable (`exercises`).
- Historial y récords por ejercicio (mejor peso/volumen).

### 3.8 Progreso (`/progreso`)
- Registro de peso y medidas (`body_metrics`), 1 por día.
- Gráficas de tendencia (peso, % grasa, cintura) en recharts.

---

## 4. Roadmap día por día

| Día | Entregable |
|---|---|
| 1 | Setup Next.js + Supabase + Auth + correr el schema. Onboarding wizard. |
| 2 | Registro de comida **manual** + base de `foods` + búsqueda. |
| 3 | Integración Gemini Vision: foto → ítems editables → guardar. |
| 4 | Dashboard con anillos del día + tendencia (recharts) + vista `v_daily_macros`. |
| 5 | Recetas CRUD + cálculo de macros por porción + sugerencia IA. |
| 6 | Planificador semanal + generación de lista de mercado. |
| 7 | Módulo de entrenos (workouts + sets) + catálogo de ejercicios. |
| 8 | Progreso (peso/medidas) + pulido PWA + deploy en Vercel. |

---

## 5. Prompt para arrancar en Claude Code

```
Construye Vital360: PWA mobile-first en Next.js 14 (App Router) + TypeScript +
Tailwind + shadcn/ui + Supabase + recharts.

Contexto:
- Ya tengo el schema SQL corrido en Supabase (tablas: profiles, nutrition_goals,
  foods, food_logs, food_log_items, recipes, recipe_ingredients, meal_plans,
  meal_plan_entries, grocery_lists, grocery_items, exercises, workouts,
  workout_sets, body_metrics; vista v_daily_macros). RLS activo: cada usuario
  solo ve lo suyo; foods/exercises con user_id NULL son globales y de solo lectura.

Principio clave: las metas de macros las carga el usuario desde su plan del
nutricionista (tabla nutrition_goals con vigencia). La app NO inventa metas ni
sugiere recortes. El conteo por IA es estimación editable, no medición exacta.

Empieza por:
1. Auth (login/signup) con Supabase + middleware de sesión.
2. Onboarding wizard de 4 pasos que escribe en profiles y nutrition_goals.
3. Layout con bottom-nav: Dashboard, Registrar, Recetas, Entrenos, Progreso.

Usa Server Actions para mutaciones. Mobile-first. Sin librerías de UI fuera de
shadcn/ui + recharts. Hazlo módulo por módulo y haz commit al terminar cada uno.
```

### Prompt para el conteo por foto (módulo IA)

```
Crea una Server Action `analyzeMealPhoto(imageBase64)` que llame a Gemini 1.5
Pro Vision. Prompt al modelo: "Identifica cada alimento visible en la foto.
Devuelve SOLO JSON, sin markdown, con este formato:
{ items: [{ name, estimated_grams, kcal, protein_g, carbs_g, fat_g, confidence }] }.
Las cantidades son estimaciones; si no estás seguro, baja el confidence."

Parsea el JSON (quita backticks por si acaso), valida con zod, y devuelve los
items para que el usuario los EDITE en un formulario antes de guardar en
food_logs + food_log_items. Guarda la respuesta cruda en food_logs.ai_raw.
Maneja errores con try/catch y muestra un fallback al registro manual.
```

---

## 6. Notas y cuidados

- **La IA se equivoca con porciones.** Por eso todo ítem es editable antes de guardar y guardas el `confidence`. No tomes el número como verdad absoluta.
- **Salud, no obsesión.** Si en algún momento la app te empuja a comportamientos rígidos o ansiosos con la comida, eso es señal de hablarlo con tu nutricionista, no de apretar más los números. La herramienta está para quitarte carga, no para sumarte presión.
- **Privacidad:** las fotos de comida van a tu Storage privado con RLS.
- Reutiliza del Finanzas360: el patrón de soft-delete con histórico, el wizard de onboarding, y el manejo de la respuesta JSON de Gemini.
