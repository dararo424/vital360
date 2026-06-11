"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useRef, useState, useTransition } from "react";
import { Loader2, Mic, Sparkles, X } from "lucide-react";
import { analyzeMealText } from "@/app/actions/photo";
import { logMeal } from "@/app/actions/foods";
import type { MealType } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  MealItemsEditor,
  defaultMeal,
  localToday,
  toEditItem,
  type EditItem,
} from "./meal-items-editor";

const EXAMPLES = [
  "dos arepas con huevo y un café con leche",
  "un plato de arroz con pollo y ensalada",
  "una manzana y un yogur griego",
];

export function TextLog() {
  const [text, setText] = useState("");
  const [items, setItems] = useState<EditItem[] | null>(null);
  const [rawAi, setRawAi] = useState<unknown>(null);

  const [mealType, setMealType] = useState<MealType>(defaultMeal);
  const [logDate, setLogDate] = useState(localToday);
  const [note, setNote] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [analyzing, startAnalyze] = useTransition();
  const [saving, startSave] = useTransition();
  const [listening, setListening] = useState(false);
  const recRef = useRef<any>(null);

  function toggleMic() {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      setError("Tu navegador no soporta dictado por voz. Escríbelo abajo.");
      return;
    }
    if (listening) {
      recRef.current?.stop();
      return;
    }
    const rec = new SR();
    rec.lang = "es-CO";
    rec.interimResults = true;
    rec.continuous = false;
    rec.onresult = (e: any) => {
      let t = "";
      for (let i = 0; i < e.results.length; i++) t += e.results[i][0].transcript;
      setText(t);
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recRef.current = rec;
    setError(null);
    setListening(true);
    rec.start();
  }

  function analyze() {
    if (!text.trim()) return;
    setError(null);
    startAnalyze(async () => {
      const res = await analyzeMealText(text);
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
        source: "manual",
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

  if (items) {
    return (
      <div className="space-y-5">
        {error && (
          <p className="flex items-center gap-1.5 text-sm text-destructive">
            <X className="size-4" /> {error}
          </p>
        )}
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
          idPrefix="text"
        />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <Label htmlFor="text-meal">Cuéntale a la app lo que comiste</Label>
      <div className="relative">
        <textarea
          id="text-meal"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={3}
          placeholder="Ej: dos arepas con huevo y un café con leche"
          className="w-full resize-none rounded-lg border border-input bg-transparent px-3 py-2 pr-12 text-base outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm"
        />
        <button
          type="button"
          onClick={toggleMic}
          aria-label={listening ? "Detener dictado" : "Dictar por voz"}
          className={cn(
            "absolute bottom-2 right-2 flex size-9 items-center justify-center rounded-full transition-colors",
            listening
              ? "animate-pulse bg-red-500 text-white"
              : "bg-primary/10 text-primary hover:bg-primary/20"
          )}
        >
          <Mic className="size-5" />
        </button>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {EXAMPLES.map((ex) => (
          <button
            key={ex}
            type="button"
            onClick={() => setText(ex)}
            className="rounded-full border px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted"
          >
            {ex}
          </button>
        ))}
      </div>

      <Button
        type="button"
        size="lg"
        className="h-11 w-full"
        onClick={analyze}
        disabled={analyzing || !text.trim()}
      >
        {analyzing ? (
          <>
            <Loader2 className="animate-spin" /> Interpretando…
          </>
        ) : (
          <>
            <Sparkles /> Interpretar con IA
          </>
        )}
      </Button>

      {error && (
        <p className="flex items-center gap-1.5 text-sm text-destructive">
          <X className="size-4" /> {error}
        </p>
      )}
    </div>
  );
}
