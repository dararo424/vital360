# 🗺️ Vital360 — Roadmap

Backlog priorizado a partir de una revisión experta (producto, nutrición,
entrenamiento, startup).

Leyenda: 🔴 alto valor · 🟡 medio · 🟢 pulido · ✅ hecho

---

## ✅ Completado

**Las 5 prioridades grandes:**
1. ✅ **Alimentos sin fricción** — Open Food Facts + código de barras (ZXing) + recientes
2. ✅ **Editar comida registrada** + **promedio móvil del peso**
3. ✅ **Cerrar el loop plan → acción** (empezar el entreno del día desde el plan)
4. ✅ **Retención** — recordatorios push (cron diario) + rachas (streaks)
5. ✅ **Rol de nutricionista/coach** (conectar por código, ver progreso, fijar metas en remoto)

**Otros entregables:** botón **Instalar app** (PWA), tema claro/oscuro automático,
rediseño visual, **diario de comidas**, **Ajustes/Perfil**, **foto IA del plato**,
**auto-recalcular meta**, fix de **zona horaria** (Bogotá) y de **safe-area** (sin solapes).

---

## 📌 Pendiente — ordenado por valor real de uso

### 🔴 Alto valor
1. **Editar/eliminar series sueltas** de un entreno ya guardado (hoy solo se borra el entreno completo).
2. **"Repetir comida de ayer"** y **favoritos** de alimentos (complementan "recientes").
3. **Agua/hidratación** y **fibra** (ya se guarda `fiber_g`, falta sumarla y mostrarla).
4. **Gráfica de progreso del cliente** en el panel del coach (hoy solo números) + **notas/mensajes** coach ↔ cliente.

### 🟡 Medio
5. **Sobrecarga progresiva** en entrenos (sugerir el peso de hoy según tu historial) + **gráfica por ejercicio**.
6. **Fotos de progreso** (antes/después) — para recomposición valen más que la báscula.
7. **Detección de estancamiento** del peso + sugerencia de ajuste.

### 🟢 Pulido / robustez
8. **Modo offline real** (el service worker hoy solo hace push; falta cachear la app para usarla sin internet).
9. **Salvaguardas de TCA** (mensajes de apoyo ante metas extremas) + **privacidad/términos** (datos de salud) + **rate-limiting de IA** (control de costos de Gemini).
10. **Skeletons de carga** y reintentos automáticos cuando la IA falla.

### 📲 Integración con salud del dispositivo
11. **Sincronizar con Apple Health (iOS) y Health Connect / Google Fit (Android)** — leer peso, pasos, calorías quemadas, frecuencia cardiaca; y opcionalmente escribir el peso/nutrición que registras en Vital360.
    > ⚠️ **Nota técnica:** una PWA por sí sola **no puede** acceder a Apple Health (HealthKit no tiene API web) ni a Health Connect. Para hacerlo bien hay que **envolver la app en un contenedor nativo** (ej. Capacitor) y publicar versiones para iOS/Android, o construir apps companion nativas. Es el ítem más grande del roadmap; conviene evaluarlo cuando la app ya tenga uso real.

---

## ⚙️ Setup pendiente (producción)

**Migraciones SQL** (Supabase → SQL Editor, en orden): `0002` … `0005`.

**Variables de entorno en Vercel** (Production):
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `GEMINI_API_KEY`,
`SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`,
`CRON_SECRET`. (Opcional: `NEXT_PUBLIC_APP_TZ`, `GEMINI_MODEL`, `GEMINI_IMAGE_MODEL`.)
Tras agregar variables `NEXT_PUBLIC_*`, **redeploy**. Ver `.env.example`.
