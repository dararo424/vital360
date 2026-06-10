"use client";

import { useEffect, useState } from "react";
import { Check, Download, Share, SquarePlus } from "lucide-react";
import { Button } from "@/components/ui/button";

/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window {
    __deferredInstallPrompt?: any;
  }
}

export function InstallButton() {
  const [available, setAvailable] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    let cancelled = false;

    // Detección inicial diferida (microtask) para no hacer setState síncrono.
    Promise.resolve().then(() => {
      if (cancelled) return;
      const standalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        (navigator as any).standalone === true;
      setInstalled(standalone);
      setIsIOS(/iphone|ipad|ipod/i.test(navigator.userAgent));
      setAvailable(!!window.__deferredInstallPrompt);
    });

    const onPrompt = (e: any) => {
      e.preventDefault();
      window.__deferredInstallPrompt = e;
      if (!cancelled) setAvailable(true);
    };
    const onInstalled = () => {
      if (cancelled) return;
      setInstalled(true);
      setAvailable(false);
      window.__deferredInstallPrompt = null;
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      cancelled = true;
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  async function install() {
    const p = window.__deferredInstallPrompt;
    if (!p) {
      setShowHelp(true);
      return;
    }
    p.prompt();
    const choice = await p.userChoice;
    window.__deferredInstallPrompt = null;
    setAvailable(false);
    if (choice?.outcome === "accepted") setInstalled(true);
  }

  if (installed) {
    return (
      <p className="flex items-center gap-2 text-sm text-emerald-600">
        <Check className="size-4" /> La app ya está instalada en este dispositivo. 🎉
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <Button
        type="button"
        size="lg"
        className="h-11 w-full"
        onClick={install}
      >
        <Download /> Instalar app
      </Button>

      {/* Instrucciones para iOS o cuando no hay prompt nativo disponible */}
      {(showHelp || (isIOS && !available)) && (
        <div className="rounded-lg border bg-muted/30 p-3 text-sm text-muted-foreground">
          {isIOS ? (
            <p>
              En iPhone/iPad: pulsa{" "}
              <Share className="inline size-4 align-text-bottom" /> (Compartir) en
              Safari y luego{" "}
              <SquarePlus className="inline size-4 align-text-bottom" /> “Agregar a
              inicio”.
            </p>
          ) : (
            <p>
              Si no apareció el diálogo, abre el menú de tu navegador (⋮) y elige{" "}
              <strong>“Instalar app”</strong> o <strong>“Agregar a pantalla de
              inicio”</strong>.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
