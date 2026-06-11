/* Vital360 — Service Worker: notificaciones push + caché offline */

const VERSION = "v1";
const STATIC = "vital360-static-" + VERSION;
const RUNTIME = "vital360-runtime-" + VERSION;
const OFFLINE_URL = "/offline";
const PRECACHE = [OFFLINE_URL, "/icon-192.png", "/icon-512.png", "/manifest.webmanifest"];

// ── Instalación: precachea el shell mínimo y la página offline ───────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC)
      .then((cache) => Promise.allSettled(PRECACHE.map((u) => cache.add(u))))
  );
  self.skipWaiting();
});

// ── Activación: limpia cachés viejas y toma control ──────────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k !== STATIC && k !== RUNTIME)
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

// ── Fetch: estrategias de caché ──────────────────────────────────────────────
self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Solo GET; los POST (server actions) van directo a la red.
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  // Otro origen (Supabase, Gemini, etc.) → red directa, sin cachear.
  if (url.origin !== self.location.origin) return;

  // No interceptamos las cargas de datos de React Server Components: son
  // específicas del usuario y deben ir siempre a la red.
  if (url.searchParams.has("_rsc") || request.headers.get("RSC") === "1") return;

  // Navegaciones (HTML): network-first → caché de lo último visto → offline.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((res) => {
          // No cacheamos redirecciones (login, etc.) ni respuestas con error.
          if (res.ok && !res.redirected) {
            const copy = res.clone();
            caches.open(RUNTIME).then((c) => c.put(request, copy).catch(() => {}));
          }
          return res;
        })
        .catch(async () => {
          const cached = await caches.match(request, { ignoreSearch: true });
          return cached || (await caches.match(OFFLINE_URL));
        })
    );
    return;
  }

  // Estáticos (JS/CSS/fuentes/imágenes): cache-first con refresco en segundo plano.
  const isStatic =
    url.pathname.startsWith("/_next/static/") ||
    /\.(?:js|css|woff2?|png|jpg|jpeg|gif|svg|webp|ico)$/.test(url.pathname);
  if (isStatic) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const network = fetch(request)
          .then((res) => {
            if (res.ok && !res.redirected) {
              const copy = res.clone();
              caches.open(STATIC).then((c) => c.put(request, copy).catch(() => {}));
            }
            return res;
          })
          .catch(() => cached);
        return cached || network;
      })
    );
  }
});

// ── Notificaciones push ──────────────────────────────────────────────────────
self.addEventListener("push", function (event) {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { title: "Vital360", body: event.data && event.data.text() };
  }
  const title = data.title || "Vital360";
  const options = {
    body: data.body || "",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    data: { url: data.url || "/dashboard" },
    vibrate: [80, 40, 80],
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", function (event) {
  event.notification.close();
  const url =
    (event.notification.data && event.notification.data.url) || "/dashboard";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then(function (list) {
      for (const c of list) {
        if (c.url.includes(url) && "focus" in c) return c.focus();
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
