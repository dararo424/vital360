"use client";

import { useRef, useState, useTransition } from "react";
import { Camera, Loader2, RefreshCw, X } from "lucide-react";
import { analyzeMealPhoto } from "@/app/actions/photo";
import { logMeal } from "@/app/actions/foods";
import type { MealType } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  MealItemsEditor,
  defaultMeal,
  localToday,
  toEditItem,
  type EditItem,
} from "./meal-items-editor";

/** Redimensiona la imagen a máx 1024px y la devuelve como JPEG base64 (sin prefijo). */
function downscale(file: File): Promise<{ base64: string; dataUrl: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const max = 1024;
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
        const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
        resolve({ base64: dataUrl.split(",")[1], dataUrl });
      };
      img.onerror = reject;
      img.src = reader.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function PhotoLog() {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [base64, setBase64] = useState<string | null>(null);
  const [mime] = useState("image/jpeg");

  const [items, setItems] = useState<EditItem[] | null>(null);
  const [rawAi, setRawAi] = useState<unknown>(null);

  const [mealType, setMealType] = useState<MealType>(defaultMeal);
  const [logDate, setLogDate] = useState(localToday);
  const [note, setNote] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [analyzing, startAnalyze] = useTransition();
  const [saving, startSave] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setItems(null);
    try {
      const { base64, dataUrl } = await downscale(file);
      setBase64(base64);
      setDataUrl(dataUrl);
    } catch {
      setError("No se pudo procesar la imagen.");
    }
  }

  function reset() {
    setDataUrl(null);
    setBase64(null);
    setItems(null);
    setRawAi(null);
    setError(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  function analyze() {
    if (!base64) return;
    setError(null);
    startAnalyze(async () => {
      const res = await analyzeMealPhoto(base64, mime);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setItems(res.items.map(toEditItem));
      setRawAi(res.raw);
    });
  }

  function save() {
    if (!items || items.length === 0) {
      setError("No hay alimentos para guardar.");
      return;
    }
    setError(null);
    startSave(async () => {
      const res = await logMeal({
        meal_type: mealType,
        log_date: logDate,
        note,
        source: "foto",
        ai_raw: rawAi,
        items: items.map((it) => ({
          food_id: null,
          name: it.name,
          quantity_g: it.quantity_g,
          kcal: it.kcal,
          protein_g: it.protein_g,
          carbs_g: it.carbs_g,
          fat_g: it.fat_g,
          fiber_g: it.fiber_g,
          ai_confidence: it.confidence,
        })),
      });
      if (res && !res.ok) setError(res.error);
    });
  }

  // ── Captura ────────────────────────────────────────────────────────────────
  if (!dataUrl) {
    return (
      <div className="space-y-3">
        <label className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed py-16 text-center hover:bg-muted/40">
          <Camera className="size-9 text-muted-foreground" />
          <span className="text-sm font-medium">Tomar o subir foto</span>
          <span className="max-w-xs px-4 text-xs text-muted-foreground">
            La IA estimará los alimentos y sus macros. Siempre podrás editarlos
            antes de guardar.
          </span>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={onPick}
          />
        </label>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="relative overflow-hidden rounded-xl border">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={dataUrl} alt="Comida" className="max-h-64 w-full object-cover" />
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="absolute right-2 top-2 h-8"
          onClick={reset}
        >
          <RefreshCw /> Cambiar
        </Button>
      </div>

      {!items && (
        <Button type="button" size="lg" className="h-11 w-full" onClick={analyze} disabled={analyzing}>
          {analyzing ? (
            <>
              <Loader2 className="animate-spin" /> Analizando…
            </>
          ) : (
            "Analizar con IA"
          )}
        </Button>
      )}

      {error && (
        <p className="flex items-center gap-1.5 text-sm text-destructive">
          <X className="size-4" /> {error}
        </p>
      )}

      {items && (
        <MealItemsEditor
          items={items}
          setItems={setItems}
          mealType={mealType}
          setMealType={setMealType}
          logDate={logDate}
          setLogDate={setLogDate}
          note={note}
          setNote={setNote}
          onSave={save}
          saving={saving}
          idPrefix="photo"
        />
      )}
    </div>
  );
}
