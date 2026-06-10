# 🗺️ Vital360 — Roadmap

Backlog priorizado a partir de una revisión experta (producto, nutrición,
entrenamiento, startup).

Leyenda: 🔴 alto valor · 🟡 medio · 🟢 pulido · ✅ hecho

---

## ✅ Completado

**Las 5 prioridades grandes:**
1. ✅ Alimentos sin fricción — Open Food Facts + código de barras (ZXing) + recientes
2. ✅ Editar comida registrada + promedio móvil del peso
3. ✅ Cerrar el loop plan → acción (empezar el entreno del día desde el plan)
4. ✅ Retención — recordatorios push (cron diario) + rachas
5. ✅ Rol de nutricionista/coach (conectar por código, ver progreso, fijar metas)

**Alto valor (segunda tanda):**
- ✅ Editar/eliminar series sueltas de un entreno guardado
- ✅ "Repetir comida" + favoritos de alimentos
- ✅ Agua / hidratación (widget en el dashboard)
- ✅ Gráfica de progreso del cliente (coach) + mensajes coach ↔ cliente

**Otros entregables:** instalar app (PWA), tema claro/oscuro, rediseño visual,
diario de comidas, Ajustes/Perfil, foto IA del plato, auto-recalcular meta,
**guardar comida como receta**, **lista de mercado con desglose IA de platos**,
fix de zona horaria (Bogotá) y safe-area.

---

## 📌 Pendiente — ordenado por valor

### 🔴 Alto valor
1. **Fibra** — sumarla y mostrarla (requiere guardarla por ítem en todos los flujos: manual, foto, repetir, editar + que la IA la estime). *(la otra mitad de "agua/fibra" quedó pendiente a propósito)*

### 🟡 Medio
2. **Sobrecarga progresiva** en entrenos (sugerir el peso de hoy según el historial) + **gráfica por ejercicio**.
3. **Fotos de progreso** (antes/después).
4. **Detección de estancamiento** del peso + sugerencia de ajuste.

### 🟢 Pulido / robustez
5. **Modo offline real** (el service worker hoy solo hace push; falta cachear la app).
6. **Salvaguardas de TCA** + **privacidad/términos** (datos de salud) + **rate-limiting de IA** (control de costos / cuota compartida con varios usuarios).
7. **Skeletons de carga** y reintentos automáticos cuando la IA falla.

### 📲 Integración con salud del dispositivo
8. **Apple Health (iOS) + Health Connect / Google Fit (Android)** — leer peso, pasos, calorías quemadas, frecuencia cardiaca; escribir lo que registras.
   > ⚠️ Una PWA no puede acceder directamente a Apple Health/Health Connect. Requiere **envolver la app en un contenedor nativo** (ej. Capacitor) y publicar en las tiendas. Es el ítem más grande del roadmap.

---

## ⚙️ Setup pendiente (producción)

**Migraciones SQL** (Supabase → SQL Editor, en orden): `0002` … `0008`.

**Variables de entorno en Vercel:** Supabase (url/anon), `GEMINI_API_KEY`,
`SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`,
`CRON_SECRET`. (Opcionales: `NEXT_PUBLIC_APP_TZ`, `GEMINI_MODEL`, `GEMINI_IMAGE_MODEL`.)
Tras agregar variables `NEXT_PUBLIC_*`, **redeploy**. Ver `.env.example`.
