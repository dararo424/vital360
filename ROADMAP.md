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
- ✅ **Sobrecarga progresiva** (última marca + gráfica por ejercicio)
- ✅ **Fotos de progreso** (galería privada antes/después)

**Otros entregables:** instalar app (PWA), tema claro/oscuro, rediseño visual,
diario de comidas, Ajustes/Perfil, foto IA del plato, auto-recalcular meta,
guardar comida como receta, lista de mercado con desglose IA, **rate-limiting de
IA por usuario**, fixes de zona horaria (Bogotá), safe-area y **decimales con
coma en el peso** (es-CO).

---

## 📌 Pendiente

### 🔴 Alto valor
1. **Fibra** — sumarla y mostrarla (requiere guardarla por ítem en todos los flujos: manual, foto, repetir, editar + que la IA la estime).

### 🟡 Medio
2. **Detección de estancamiento** del peso + sugerencia de ajuste (cuando la tendencia no baja en X semanas).
3. **Comparador antes/después** de fotos de progreso (lado a lado) + más métricas en el panel del coach.
4. **Plantillas/rutinas de entreno** reutilizables + temporizador de descanso entre series.

### 🟢 Pulido / robustez
5. **Modo offline real** (el service worker hoy solo hace push; falta cachear la app).
6. **Salvaguardas de TCA** (mensajes de apoyo ante metas extremas) + **privacidad/términos** (datos de salud).
7. **Skeletons de carga** y reintentos automáticos cuando la IA falla.
8. **Decimales con coma en TODOS los campos** (hoy solo peso/medidas; faltaría macros, gramos, etc. para consistencia total).

### 📲 Integración con salud del dispositivo
9. **Apple Health (iOS) + Health Connect / Google Fit (Android)** — leer peso, pasos, calorías quemadas, frecuencia cardiaca; escribir lo que registras.
   > ⚠️ Una PWA no puede acceder directamente a Apple Health/Health Connect. Requiere **envolver la app en un contenedor nativo** (ej. Capacitor) y publicar en las tiendas. Es el ítem más grande del roadmap.

---

## ⚙️ Setup pendiente (producción)

**Migraciones SQL** (Supabase → SQL Editor, en orden): `0002` … `0010`.

**Variables de entorno en Vercel:** Supabase (url/anon), `GEMINI_API_KEY`,
`SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`,
`CRON_SECRET`. (Opcionales: `NEXT_PUBLIC_APP_TZ`, `GEMINI_MODEL`, `GEMINI_IMAGE_MODEL`.)
Tras agregar variables `NEXT_PUBLIC_*`, **redeploy**. Ver `.env.example`.
