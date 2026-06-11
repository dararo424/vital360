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
- ✅ **Fotos de progreso** (galería privada + comparador antes/después)
- ✅ **Fibra** (registrar, sumar y mostrar en el diario)
- ✅ **Detección de estancamiento** del peso + sugerencia de apoyo
- ✅ **Plantillas/rutinas de entreno** + temporizador de descanso
- ✅ **Métricas del coach** (adherencia kcal/macros 14 días + fotos del cliente)

**Otros entregables:** instalar app (PWA), tema claro/oscuro, rediseño visual,
diario de comidas, Ajustes/Perfil, foto IA del plato, auto-recalcular meta,
guardar comida como receta, lista de mercado con desglose IA, **rate-limiting de
IA por usuario**, fixes de zona horaria (Bogotá), safe-area y **decimales con
coma en el peso** (es-CO).

---

## 📌 Pendiente

### 🟢 Pulido / robustez
1. ✅ ~~Soporte offline (básico)~~ — el SW cachea el shell y los assets, abre sin conexión con pantalla `/offline` y sirve lo último visto. (Pendiente avanzado: registrar comidas offline y sincronizar.)
2. ✅ ~~Salvaguardas de TCA + privacidad/términos~~ — página /legal, consentimiento al registrarse, banners de apoyo ante metas extremas (onboarding y ajustes).
3. ✅ ~~Skeletons de carga + feedback de navegación~~ — esqueleto al cambiar de pantalla + spinner en el ítem del nav. (Pendiente: reintentos automáticos cuando la IA falla.)
4. ✅ ~~Decimales con coma en todos los campos relevantes~~ — componente `DecimalInput` (peso/reps/RPE, macros, metas, etc.).
5. ✅ ~~Coach nutricional IA~~ — análisis semanal de alimentos vs metas con consejos accionables.
6. **Offline avanzado** — registrar comidas/pesos sin conexión y sincronizar al reconectar (cola en IndexedDB + resolución de conflictos). Hoy hay offline básico (shell + última vista).

### 📲 Integración con salud del dispositivo (DIFERIDO — decisión: retomar al ir a tiendas)
7. **Apple Health (iOS) + Health Connect (Android)** — leer peso, pasos, calorías quemadas, frecuencia cardiaca; y escribir lo que registras.

   **Por qué no se puede en la PWA:** Apple Health (HealthKit) **no tiene API web** y Health Connect es **API nativa de Android**. (Google Fit REST se apaga en 2026.) Solo se accede desde apps **nativas**.

   **Plan técnico (cuando se decida publicar en tiendas):**
   1. Envolver la web ya desplegada en **Capacitor** (webview apuntando a la URL de Vercel → mantiene SSR/server actions/auth tal cual).
   2. Agregar un plugin de salud (ej. `@capacitor-community/health` o `capacitor-health`) para leer/escribir peso, pasos y energía.
   3. Módulo de sincronización: al abrir, leer peso/pasos del día y volcarlos a `body_metrics` (y opcionalmente escribir lo registrado en la app hacia Health).
   4. Compilar: **iOS** necesita un **Mac** o CI (EAS/Codemagic) + **Apple Developer (US$99/año)** + entitlement de HealthKit + textos de privacidad. **Android**: **Google Play (US$25)** + declaración de permisos de Health Connect.
   5. Pasar **revisión de tiendas** (apps de salud tienen escrutinio extra).

   **Costo aprox.:** ~US$99/año (Apple) + US$25 (Google) + tiempo de build/publicación. Requiere Mac/CI y cuentas de desarrollador.

---

## ⚙️ Setup pendiente (producción)

**Migraciones SQL** (Supabase → SQL Editor, en orden): `0002` … `0012`.

**Variables de entorno en Vercel:** Supabase (url/anon), `GEMINI_API_KEY`,
`SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`,
`CRON_SECRET`. (Opcionales: `NEXT_PUBLIC_APP_TZ`, `GEMINI_MODEL`, `GEMINI_IMAGE_MODEL`.)
Tras agregar variables `NEXT_PUBLIC_*`, **redeploy**. Ver `.env.example`.
