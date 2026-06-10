# 🗺️ Vital360 — Roadmap

Backlog priorizado a partir de una revisión experta (producto, nutrición,
entrenamiento, startup). El MVP está completo y desplegado; esto es lo que
falta para que la app **enganche y escale**.

Leyenda: 🔴 alto impacto · 🟡 medio · 🟢 pulido · ✅ hecho · 🚧 en curso

---

## 🎯 Orden recomendado

1. 🔴 **Alimentos sin fricción** — Open Food Facts + código de barras + recientes/favoritos 🚧
2. 🔴 **Editar comida registrada** + **promedio móvil del peso**
3. 🔴 **Cerrar el loop plan → acción** (empezar entreno / agregar receta del plan al día)
4. 🟡 **Retención** — recordatorios/notificaciones + rachas (streaks)
5. 🟡 **Rol de nutricionista/coach** (el diferenciador: tu nutri ajusta tus metas en remoto)

---

## 🥗 Nutrición

- 🔴 **Base de alimentos**: integrar **Open Food Facts** (gratis, en español, con códigos de barras) + sembrar alimentos comunes latinos. *(la tabla `foods` arranca vacía → fricción #1)*
- 🔴 **Recientes / favoritos / "repetir comida de ayer"**.
- 🔴 **Editar** una comida registrada (hoy solo se borra).
- 🟡 **Fibra** (ya se guarda `fiber_g`, falta sumarla/mostrarla) y **agua/hidratación**.
- 🟡 **Medidas caseras** (1 taza, 1 cda) además de gramos.
- 🟡 **Promedio móvil del peso** (7 días) y **detección de estancamiento**.
- 🟢 **Diet breaks / refeeds** programados para déficits largos.

## 🏋️ Entrenamiento

- 🔴 **Conectar plan IA → entrenos**: "empezar el entreno del Día 1" desde el plan.
- 🟡 **Sobrecarga progresiva** (sugerir peso según historial) + **gráficas por ejercicio**.
- 🟡 **Rutinas/plantillas** reutilizables + **temporizador de descanso**.
- 🟢 **Instrucciones/video por ejercicio**.
- 🟢 **Fotos de progreso** (antes/después).

## 📱 Producto / UX

- 🟡 **Recordatorios/notificaciones** (registrar comidas, pesarse) + **rachas**.
- 🟡 **Modo offline real** (service worker / cache de la PWA).
- 🟢 **Skeletons de carga**, reintentos cuando la IA falla, microcopys.
- 🟢 Buscar/filtrar en recetas y alimentos.

## 🚀 Startup / Negocio

- 🟡 **Rol de coach/nutricionista**: vincular a tu nutri para que vea progreso y ajuste metas (encaja con el principio de la app y con compartirla en familia).
- 🟡 **Privacidad y términos** (datos de salud) + **salvaguardas de TCA** (mensajes de apoyo ante metas extremas).
- 🟡 **Rate-limiting de IA** por usuario (control de costos de Gemini).
- 🟢 Exportar datos (PDF/CSV), analítica de retención, i18n.

## 🔧 Técnico

- 🟢 Monitoreo de errores (Sentry), tests, backups.
- 🟢 Revisar timeouts de IA en Vercel Hobby (ya hay `maxDuration = 60`).
