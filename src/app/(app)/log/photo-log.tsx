"use client";

import { useRef, useState, useTransition } from "react";
import { Camera, Loader2, RefreshCw, Trash2, X } from "lucide-react";
import { analyzeMealPhoto } from "@/app/actions/photo";
import { logMeal } from "@/app/actions/foods";
import {
  MEAL_TYPES,
  MEAL_TYPE_LABELS,
  round1,
  type AnalyzedItem,
  type MealType,
} from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type EditItem = {
  key: string;
  name: string;
  quantity_g: number;
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  confidence: number;
  fiber_g: number;
  perGram: { kcal: number; p: number; c: number; f: number; fiber: number };
};

function localToday(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function defaultMeal(): MealType {
  const h = new Date().getHours();
  if (h < 11) return "desayuno";
  if (h < 16) return "almuerzo";
  if (h < 21) return "cena";
  return "snack";
}

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

function toEditItem(a: AnalyzedItem, i: number): EditItem {
  const g = a.estimated_grams > 0 ? a.estimated_grams : 1;
  return {
    key: `${i}-${a.name}`,
    name: a.name,
    quantity_g: Math.round(a.estimated_grams),
    kcal: Math.round(a.kcal),
    protein_g: round1(a.protein_g),
    carbs_g: round1(a.carbs_g),
    fat_g: round1(a.fat_g),
    fiber_g: round1(a.fiber_g ?? 0),
    confidence: a.confidence,
    perGram: {
      kcal: a.kcal / g,
      p: a.protein_g / g,
      c: a.carbs_g / g,
      f: a.fat_g / g,
      fiber: (a.fiber_g ?? 0) / g,
    },
  };
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

  function setQty(key: string, grams: number) {
    setItems((prev) =>
      prev!.map((it) =>
        it.key === key
          ? {
              ...it,
              quantity_g: Math.max(0, grams),
              kcal: Math.round(it.perGram.kcal * grams),
              protein_g: round1(it.perGram.p * grams),
              carbs_g: round1(it.perGram.c * grams),
              fat_g: round1(it.perGram.f * grams),
              fiber_g: round1(it.perGram.fiber * grams),
            }
          : it
      )
    );
  }

  function setField(key: string, field: keyof EditItem, value: string) {
    setItems((prev) =>
      prev!.map((it) =>
        it.key === key
          ? { ...it, [field]: field === "name" ? value : Number(value) }
          : it
      )
    );
  }

  function removeItem(key: string) {
    setItems((prev) => prev!.filter((it) => it.key !== key));
  }

  const totals = (items ?? []).reduce(
    (a, it) => ({
      kcal: a.kcal + it.kcal,
      protein_g: a.protein_g + it.protein_g,
      carbs_g: a.carbs_g + it.carbs_g,
      fat_g: a.fat_g + it.fat_g,
    }),
    { kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0 }
  );

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
      {/* Preview */}
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
        <Button
          type="button"
          size="lg"
          className="h-11 w-full"
          onClick={analyze}
          disabled={analyzing}
        >
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
        <>
          <div className="rounded-lg border border-amber-300/60 bg-amber-50 p-3 text-xs text-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
            Estimación de la IA. Revisa y ajusta gramos y macros antes de guardar.
          </div>

          {/* Tipo de comida */}
          <div className="space-y-2">
            <Label>Comida</Label>
            <div className="grid grid-cols-4 gap-2">
              {MEAL_TYPES.map((m) => (
                <Button
                  key={m}
                  type="button"
                  variant={mealType === m ? "default" : "outline"}
                  size="sm"
                  className="h-9"
                  onClick={() => setMealType(m)}
                >
                  {MEAL_TYPE_LABELS[m]}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="photo-date">Fecha</Label>
            <Input
              id="photo-date"
              type="date"
              value={logDate}
              max={localToday()}
              onChange={(e) => setLogDate(e.target.value)}
            />
          </div>

          {/* Ítems editables */}
          <ul className="space-y-3">
            {items.map((it) => (
              <li key={it.key} className="rounded-lg border bg-card p-3">
                <div className="flex items-center gap-2">
                  <Input
                    value={it.name}
                    onChange={(e) => setField(it.key, "name", e.target.value)}
                    className="h-8 font-medium"
                  />
                  <ConfidenceBadge value={it.confidence} />
                  <button
                    type="button"
                    onClick={() => removeItem(it.key)}
                    aria-label="Quitar"
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
                <div className="mt-2 grid grid-cols-5 gap-2">
                  <NumCell
                    label="Gramos"
                    value={it.quantity_g}
                    onChange={(v) => setQty(it.key, v)}
                  />
                  <NumCell
                    label="Kcal"
                    value={it.kcal}
                    onChange={(v) => setField(it.key, "kcal", String(v))}
                  />
                  <NumCell
                    label="Prot."
                    value={it.protein_g}
                    onChange={(v) => setField(it.key, "protein_g", String(v))}
                  />
                  <NumCell
                    label="Carbs"
                    value={it.carbs_g}
                    onChange={(v) => setField(it.key, "carbs_g", String(v))}
                  />
                  <NumCell
                    label="Grasa"
                    value={it.fat_g}
                    onChange={(v) => setField(it.key, "fat_g", String(v))}
                  />
                </div>
              </li>
            ))}
          </ul>

          <div className="space-y-1.5">
            <Label htmlFor="photo-note">Nota (opcional)</Label>
            <Input
              id="photo-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Algo que recordar de esta comida"
            />
          </div>

          {/* Totales + guardar */}
          <div className="sticky bottom-[calc(5rem+env(safe-area-inset-bottom))] space-y-3 rounded-xl border bg-background/95 p-3 shadow-sm backdrop-blur">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Total</span>
              <span>
                <span className="font-semibold">{Math.round(totals.kcal)} kcal</span>
                <span className="text-muted-foreground">
                  {" "}
                  · P {Math.round(totals.protein_g)} · C{" "}
                  {Math.round(totals.carbs_g)} · G {Math.round(totals.fat_g)} g
                </span>
              </span>
            </div>
            <Button
              type="button"
              size="lg"
              className="h-11 w-full"
              onClick={save}
              disabled={saving || items.length === 0}
            >
              {saving ? "Guardando…" : "Guardar comida"}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

function ConfidenceBadge({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const tone =
    value >= 0.7
      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
      : value >= 0.4
        ? "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
        : "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300";
  return (
    <span
      className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${tone}`}
      title="Confianza de la estimación de la IA"
    >
      {pct}%
    </span>
  );
}

function NumCell({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-[10px] text-muted-foreground">{label}</Label>
      <Input
        type="number"
        inputMode="decimal"
        value={String(value)}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-8 px-1.5 text-center text-sm"
      />
    </div>
  );
}
