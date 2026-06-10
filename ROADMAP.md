# 🗺️ Vital360 — Roadmap

Backlog priorizado a partir de una revisión experta (producto, nutrición,
entrenamiento, startup).

Leyenda: 🔴 alto impacto · 🟡 medio · 🟢 pulido · ✅ hecho

---

## 🎯 Prioridades (las 5 grandes) — ✅ COMPLETADAS

1. ✅ **Alimentos sin fricción** — Open Food Facts + código de barras (ZXing) + recientes
2. ✅ **Editar comida registrada** + **promedio móvil del peso**
3. ✅ **Cerrar el loop plan → acción** (empezar el entreno del día desde el plan)
4. ✅ **Retención** — recordatorios push (cron diario) + rachas (streaks)
5. ✅ **Rol de nutricionista/coach** (conectar por código, ver progreso, fijar metas en remoto)

Otros entregables ya hechos en el camino: botón **Instalar app** (PWA), tema
claro/oscuro automático, rediseño visual, **diario de comidas**, pantalla de
**Ajustes/Perfil**, **foto IA del plato**, **auto-recalcular meta**.

---

## 🥗 Nutrición

- ✅ Open Food Facts + código de barras + recientes.
- ✅ Editar una comida registrada.
- 🟡 **Favoritos** y **"repetir comida de ayer"** (recientes ya está).
- 🟡 **Fibra** (ya se guarda `fiber_g`, falta sumarla/mostrarla) y **agua/hidratación**.
- 🟡 **Medidas caseras** (1 taza, 1 cda) además de gramos.
- ✅ Promedio móvil del peso (7 días).
- 🟡 **Detección de estancamiento** + sugerencia de ajuste.
- 🟢 **Diet breaks / refeeds** programados para déficits largos.
- 🟢 Sembrar alimentos comunes latinos como globales.

## 🏋️ Entrenamiento

- ✅ Conectar plan IA → entrenos (empezar el entreno del día).
- 🟡 **Sobrecarga progresiva** (sugerir peso según historial) + **gráficas por ejercicio**.
- 🟡 **Rutinas/plantillas** reutilizables + **temporizador de descanso**.
- 🟢 **Instrucciones/video por ejercicio**.
- 🟢 **Fotos de progreso** (antes/después).

## 📱 Producto / UX

- ✅ Recordatorios push + rachas + botón instalar.
- 🟡 **Modo offline real** (el service worker hoy solo maneja push; falta cache).
- 🟢 **Skeletons de carga**, reintentos cuando la IA falla, microcopys.
- 🟢 Buscar/filtrar en recetas; más vistas del histórico.

## 🚀 Startup / Negocio

- ✅ Rol de coach/nutricionista (vincular + ajustar metas).
- 🟡 **Mensajería coach ↔ cliente** y notas; gráfica de progreso del cliente en el panel.
- 🟡 **Privacidad y términos** (datos de salud) + **salvaguardas de TCA**.
- 🟡 **Rate-limiting de IA** por usuario (control de costos de Gemini).
- 🟢 Exportar datos (PDF/CSV), analítica de retención, i18n.

## 🔧 Técnico

- 🟢 Monitoreo de errores (Sentry), tests, backups.
- 🟢 Zona horaria: hoy se usa fecha UTC; revisar para usuarios fuera de UTC.
- 🟢 Revisar timeouts de IA en Vercel Hobby (ya hay `maxDuration = 60`).

---

## ⚙️ Setup pendiente (para que todo funcione en producción)

Migraciones SQL a correr en Supabase (en orden): `0002` … `0005`.
Variables de entorno en Vercel: Supabase (url/anon), `GEMINI_API_KEY`,
`NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `CRON_SECRET`,
`SUPABASE_SERVICE_ROLE_KEY`. Ver `.env.example`.
