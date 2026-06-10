"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Camera, Loader2, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  deleteProgressPhoto,
  saveProgressPhoto,
} from "@/app/actions/progress-photos";
import type { ProgressPhoto } from "@/lib/dal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function downscaleToBlob(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const max = 1280;
        let { width, height } = img;
        if (width > max || height > max) {
          const r = Math.min(max / width, max / height);
          width = Math.round(width * r);
          height = Math.round(height * r);
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("canvas"));
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("blob"))), "image/jpeg", 0.8);
      };
      img.onerror = reject;
      img.src = reader.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function ProgressPhotos({
  userId,
  photos,
}: {
  userId: string;
  photos: ProgressPhoto[];
}) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [busy, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    start(async () => {
      try {
        const blob = await downscaleToBlob(file);
        const supabase = createClient();
        const path = `${userId}/${crypto.randomUUID()}.jpg`;
        const { error: upErr } = await supabase.storage
          .from("progress-photos")
          .upload(path, blob, { contentType: "image/jpeg", upsert: false });
        if (upErr) {
          setError("No se pudo subir la foto.");
          return;
        }
        const res = await saveProgressPhoto(path, note);
        if (!res.ok) {
          setError(res.error ?? "Error");
          return;
        }
        setNote("");
        if (fileRef.current) fileRef.current.value = "";
        router.refresh();
      } catch {
        setError("No se pudo procesar la imagen.");
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Nota (opcional): semana 1, antes…"
        />
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={onPick}
        />
        <Button
          type="button"
          size="lg"
          className="h-11 w-full"
          disabled={busy}
          onClick={() => fileRef.current?.click()}
        >
          {busy ? <Loader2 className="animate-spin" /> : <Camera />}
          {busy ? "Subiendo…" : "Agregar foto de progreso"}
        </Button>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>

      {photos.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {photos.map((p) => (
            <div key={p.id} className="relative overflow-hidden rounded-lg border">
              {p.url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.url} alt="Progreso" className="aspect-square w-full object-cover" />
              ) : (
                <div className="flex aspect-square items-center justify-center bg-muted text-xs text-muted-foreground">
                  No disponible
                </div>
              )}
              <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/60 to-transparent px-2 py-1.5">
                <span className="text-[11px] font-medium text-white">
                  {new Date(p.taken_on + "T00:00:00").toLocaleDateString("es", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
                <button
                  type="button"
                  aria-label="Borrar"
                  onClick={() => {
                    if (confirm("¿Borrar esta foto?"))
                      start(async () => {
                        await deleteProgressPhoto(p.id);
                        router.refresh();
                      });
                  }}
                  className="text-white/90 hover:text-white"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
              {p.note && (
                <span className="absolute left-1 top-1 rounded bg-black/50 px-1.5 py-0.5 text-[10px] text-white">
                  {p.note}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
