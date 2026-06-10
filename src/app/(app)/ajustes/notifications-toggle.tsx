"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff, Loader2 } from "lucide-react";
import {
  deletePushSubscription,
  savePushSubscription,
} from "@/app/actions/push";
import { Button } from "@/components/ui/button";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

export function NotificationsToggle() {
  const [supported, setSupported] = useState(true);
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.resolve().then(async () => {
      const ok =
        typeof window !== "undefined" &&
        "serviceWorker" in navigator &&
        "PushManager" in window &&
        "Notification" in window;
      if (cancelled) return;
      setSupported(ok);
      if (!ok) return;
      try {
        const reg = await navigator.serviceWorker.getRegistration();
        const sub = reg ? await reg.pushManager.getSubscription() : null;
        if (!cancelled) setEnabled(!!sub);
      } catch {
        /* noop */
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  async function enable() {
    setBusy(true);
    setError(null);
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        setError("Permiso de notificaciones denegado.");
        return;
      }
      const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!key) {
        setError("Falta configurar la clave VAPID.");
        return;
      }
      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(key) as BufferSource,
      });
      const json = sub.toJSON() as {
        endpoint: string;
        keys: { p256dh: string; auth: string };
      };
      const res = await savePushSubscription({
        endpoint: json.endpoint,
        keys: json.keys,
      });
      if (res.ok) setEnabled(true);
      else setError(res.error ?? "No se pudo activar.");
    } catch {
      setError("No se pudo activar. Revisa los permisos del navegador.");
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    setError(null);
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = reg ? await reg.pushManager.getSubscription() : null;
      if (sub) {
        await deletePushSubscription(sub.endpoint);
        await sub.unsubscribe();
      }
      setEnabled(false);
    } catch {
      setError("No se pudo desactivar.");
    } finally {
      setBusy(false);
    }
  }

  if (!supported) {
    return (
      <p className="text-sm text-muted-foreground">
        Tu navegador no soporta notificaciones push. En iPhone, primero{" "}
        <strong>instala la app</strong> (arriba) y ábrela desde la pantalla de
        inicio.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant={enabled ? "outline" : "default"}
        size="lg"
        className="h-11 w-full"
        disabled={busy}
        onClick={enabled ? disable : enable}
      >
        {busy ? (
          <Loader2 className="animate-spin" />
        ) : enabled ? (
          <BellOff />
        ) : (
          <Bell />
        )}
        {enabled ? "Desactivar recordatorios" : "Activar recordatorios"}
      </Button>
      {enabled && (
        <p className="text-xs text-emerald-600">
          Activos ✓ — te avisaremos si no registras durante el día.
        </p>
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
