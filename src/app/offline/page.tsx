import type { Metadata } from "next";
import { WifiOff } from "lucide-react";
import { RetryButton } from "./retry-button";

export const metadata: Metadata = { title: "Sin conexión · Vital360" };

export default function OfflinePage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="flex size-16 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <WifiOff className="size-8" />
      </div>
      <h1 className="text-xl font-semibold tracking-tight">Estás sin conexión</h1>
      <p className="max-w-xs text-sm text-muted-foreground">
        No pudimos cargar esta pantalla. Revisa tu internet e inténtalo de nuevo.
        Lo que ya habías visto puede seguir disponible.
      </p>
      <RetryButton />
    </main>
  );
}
