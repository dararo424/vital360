# 🌱 Vital360

App web **mobile-first (PWA)** de nutrición + ejercicio con IA: conteo de calorías por foto, plan estimado personalizado, recetas dentro de tus macros, planificador semanal, entrenos y seguimiento de progreso.

> **Principio de diseño (no negociable):** las metas de macros las define **tu nutricionista**, no la app. Vital360 cuenta, registra y sugiere _dentro_ de tus metas. La IA da un **estimado de apoyo, editable**, nunca una prescripción médica ni déficits agresivos. Es para quitarte carga, no para sumarte presión.

---

## ✨ Funcionalidades

- **Onboarding inteligente** — cuestionario por pasos (cuerpo, estilo de vida, hábitos/antojos, objetivo). Calcula tu base calórica con la fórmula **Mifflin-St Jeor** y genera un **plan personalizado con IA** (entreno + consejos + recetas anti-antojo).
- **Tu plan** (`/mi-plan`) — estimado diario, plan de entreno, consejos, "calma tus antojos" y recetas recomendadas con foto IA y enlace a video.
- **Registro de comida** (`/log`) — por **foto** (Gemini Vision estima alimentos y macros, editables) o **manual** (busca/crea alimentos).
- **Diario** (`/diario`) — lo que comiste por día, agrupado por comida, con totales vs meta y navegación de fechas.
- **Dashboard** — anillo de calorías + macros del día, tendencia 7/30 días (recharts) y peso.
- **Recetas** (`/recetas`) — CRUD con macros por porción, tags, favoritos, **sugerencia con IA** dentro de tus macros y **foto IA del plato**.
- **Plan semanal** (`/plan`) + **lista de mercado** (`/mercado`) automática agrupada por categoría.
- **Entrenos** (`/entrenos`) — fuerza y cardio con series, catálogo de ejercicios y récords.
- **Progreso** (`/progreso`) — peso y medidas con gráficas; meta que **se recalcula sola** (modo adaptable).
- **Ajustes** (`/ajustes`) — editar perfil, objetivo, intensidad, metas a mano y modo adaptable.
- **PWA** instalable, con tema claro/oscuro automático.

## 🧱 Stack

Next.js 16 (App Router) · TypeScript · Tailwind v4 + shadcn/ui · Supabase (Postgres + Auth + Storage, con RLS) · Gemini (texto e imagen) · recharts · zod.

---

## 🚀 Puesta en marcha (local)

### 1. Requisitos
- Node.js 20+
- Un proyecto de **Supabase** con el esquema base ya creado (tablas: `profiles`, `nutrition_goals`, `foods`, `food_logs`, `food_log_items`, `recipes`, `recipe_ingredients`, `meal_plans`, `meal_plan_entries`, `grocery_lists`, `grocery_items`, `exercises`, `workouts`, `workout_sets`, `body_metrics`; vista `v_daily_macros`; RLS activo).
- Una **API key de Gemini** (Google AI Studio).

### 2. Instalar
```bash
git clone https://github.com/dararo424/vital360.git
cd vital360
npm install
```

### 3. Variables de entorno
Copia `.env.example` a `.env.local` y rellena los valores:
```bash
cp .env.example .env.local
```
| Variable | Descripción |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon/public key de Supabase |
| `GEMINI_API_KEY` | API key de Gemini |
| `GEMINI_MODEL` _(opcional)_ | Modelo de texto (def. `gemini-2.5-flash`) |
| `GEMINI_IMAGE_MODEL` _(opcional)_ | Modelo de imagen (def. `gemini-2.5-flash-image`) |

### 4. Migraciones de base de datos
Sobre el esquema base, corre en **Supabase → SQL Editor** (en orden, son idempotentes):
- `supabase/migrations/0002_smart_plan.sql` — columnas para el onboarding inteligente y el plan IA en `profiles`.
- `supabase/migrations/0003_recipe_photos.sql` — bucket `recipe-photos` + columna `recipes.image_url` para las fotos IA.

### 5. Correr
```bash
npm run dev
```
Abre http://localhost:3000

---

## ☁️ Deploy en Vercel

1. **Importa el repo** en [vercel.com](https://vercel.com) (Add New → Project). Detecta Next.js automáticamente.
2. Agrega las **variables de entorno** (las mismas de `.env.local`) para Production.
3. **Deploy**. Obtienes una URL tipo `https://tu-app.vercel.app`.
4. En **Supabase → Authentication → URL Configuration**, pon esa URL como **Site URL** y agrégala a **Redirect URLs** (`https://tu-app.vercel.app/**`) — necesario para que los correos de confirmación funcionen.

Cada `push` a `main` redespliega automáticamente.

> **Nota sobre la IA:** los modelos de **texto** de Gemini funcionan en el tier gratis. La **generación de imágenes** (foto IA del plato) requiere **facturación activa con crédito** en tu proyecto de Google AI Studio. Las funciones que llaman a la IA usan `maxDuration = 60` (compatible con el plan Hobby de Vercel).

---

## 📁 Estructura

```
src/
  app/
    (auth)/          login, signup
    (app)/           área autenticada: dashboard, diario, log, recetas,
                     plan, mercado, entrenos, progreso, mi-plan, ajustes
    onboarding/      cuestionario inteligente
    actions/         Server Actions (auth, foods, recipes, plan, workouts,
                     progress, onboarding, settings, photo)
    manifest.ts      PWA
  lib/
    supabase/        clientes server/browser + helper de sesión
    dal.ts           data access layer (lecturas con verificación de sesión)
    nutrition-plan.ts motor de cálculo (Mifflin-St Jeor) + catálogos
    gemini.ts        llamadas a Gemini (plan, recetas, visión, imagen)
    types.ts         tipos y schemas zod (valores alineados a la base)
  proxy.ts           middleware de sesión (en Next 16 se llama "Proxy")
supabase/migrations/ SQL incremental (0002, 0003)
```

## 🔒 Privacidad

Cada usuario solo ve sus datos gracias a **RLS** en Supabase. Las fotos de comida y de platos viven en tu propio Storage.

---

_Proyecto personal. Construido con Next.js + Supabase + Gemini._
