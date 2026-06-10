"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Barcode, ScanLine } from "lucide-react";
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
  const [manualOnly, setManualOnly] = useState(false);
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

  useEffect(() => {
    if (!open) return;
    let stream: MediaStream | null = null;
    let interval: ReturnType<typeof setInterval> | null = null;
    let cancelled = false;

    const supported =
      typeof window !== "undefined" &&
      "BarcodeDetector" in window &&
      !!navigator.mediaDevices?.getUserMedia;

    if (!supported) {
      Promise.resolve().then(() => !cancelled && setManualOnly(true));
      return () => {
        cancelled = true;
      };
    }

    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });
        if (cancelled || !videoRef.current) {
          stream?.getTracks().forEach((t) => t.stop());
          return;
        }
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        const Detector = (window as any).BarcodeDetector;
        const detector = new Detector({
          formats: ["ean_13", "ean_8", "upc_a", "upc_e", "code_128"],
        });
        interval = setInterval(async () => {
          if (cancelled || !videoRef.current) return;
          try {
            const found = await detector.detect(videoRef.current);
            if (found?.length) submit(String(found[0].rawValue));
          } catch {
            /* frame sin código */
          }
        }, 400);
      } catch {
        if (!cancelled) setError("No se pudo abrir la cámara. Ingresa el código a mano.");
      }
    })();

    return () => {
      cancelled = true;
      if (interval) clearInterval(interval);
      stream?.getTracks().forEach((t) => t.stop());
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
          setManualOnly(false);
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

          {!manualOnly && !error && (
            <div className="relative overflow-hidden rounded-xl bg-black">
              <video ref={videoRef} playsInline muted className="h-56 w-full object-cover" />
              <ScanLine className="absolute inset-0 m-auto size-24 text-white/70" />
            </div>
          )}

          {error && <p className="text-sm text-amber-600">{error}</p>}

          <div className="space-y-1.5">
            <p className="text-xs text-muted-foreground">
              {manualOnly
                ? "Tu dispositivo no soporta escaneo. Ingresa el código a mano:"
                : "¿No escanea? Ingrésalo a mano:"}
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
