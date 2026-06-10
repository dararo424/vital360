"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Barcode } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

/* eslint-disable @typescript-eslint/no-explicit-any */

export function BarcodeScanner({
  onDetected,
}: {
  onDetected: (code: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [manual, setManual] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const onDetectedRef = useRef(onDetected);
  useEffect(() => {
    onDetectedRef.current = onDetected;
  });

  const submit = useCallback((code: string) => {
    const clean = code.replace(/\D/g, "");
    if (!clean) return;
    setOpen(false);
    onDetectedRef.current(clean);
  }, []);

  // Escaneo con ZXing (funciona en cualquier navegador con cámara).
  useEffect(() => {
    if (!open) return;
    let controls: { stop: () => void } | null = null;
    let cancelled = false;

    (async () => {
      try {
        const { BrowserMultiFormatReader } = await import("@zxing/browser");
        if (cancelled || !videoRef.current) return;
        const reader = new BrowserMultiFormatReader();
        controls = await reader.decodeFromConstraints(
          { video: { facingMode: { ideal: "environment" } } },
          videoRef.current,
          (result: any) => {
            if (result) submit(result.getText());
          }
        );
        if (cancelled) controls?.stop();
      } catch {
        if (!cancelled) {
          setError("No se pudo abrir la cámara. Ingresa el código a mano.");
        }
      }
    })();

    return () => {
      cancelled = true;
      try {
        controls?.stop();
      } catch {
        /* noop */
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="lg"
        className="h-11 w-full"
        onClick={() => {
          setError(null);
          setManual("");
          setOpen(true);
        }}
      >
        <Barcode /> Escanear código de barras
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Escanear código</DialogTitle>
          </DialogHeader>

          {!error && (
            <div className="relative overflow-hidden rounded-xl bg-black">
              <video
                ref={videoRef}
                playsInline
                muted
                className="h-60 w-full object-cover"
              />
              <div className="pointer-events-none absolute inset-x-6 top-1/2 h-0.5 -translate-y-1/2 bg-red-500/70" />
            </div>
          )}

          {error && <p className="text-sm text-amber-600">{error}</p>}

          <div className="space-y-1.5">
            <p className="text-xs text-muted-foreground">
              {error ? "Ingresa el código a mano:" : "¿No enfoca? Ingrésalo a mano:"}
            </p>
            <div className="flex gap-2">
              <Input
                value={manual}
                onChange={(e) => setManual(e.target.value)}
                inputMode="numeric"
                placeholder="Ej. 3017620422003"
                onKeyDown={(e) => e.key === "Enter" && submit(manual)}
              />
              <Button type="button" className="shrink-0" onClick={() => submit(manual)}>
                Buscar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
