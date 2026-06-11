"use client";

import { Trash2 } from "lucide-react";
import { round1, MEAL_TYPES, MEAL_TYPE_LABELS, type AnalyzedItem, type MealType } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type EditItem = {
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

export function localToday(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function defaultMeal(): MealType {
  const h = new Date().getHours();
  if (h < 11) return "desayuno";
  if (h < 16) return "almuerzo";
  if (h < 21) return "cena";
  return "snack";
}

export function toEditItem(a: AnalyzedItem, i: number): EditItem {
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

/** Editor común para los ítems estimados por IA (foto o texto) + guardar. */
export function MealItemsEditor({
  items,
  setItems,
  mealType,
  setMealType,
  logDate,
  setLogDate,
  note,
  setNote,
  onSave,
  saving,
  idPrefix,
}: {
  items: EditItem[];
  setItems: React.Dispatch<React.SetStateAction<EditItem[] | null>>;
  mealType: MealType;
  setMealType: (m: MealType) => void;
  logDate: string;
  setLogDate: (d: string) => void;
  note: string;
  setNote: (n: string) => void;
  onSave: () => void;
  saving: boolean;
  idPrefix: string;
}) {
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
        it.key === key ? { ...it, [field]: field === "name" ? value : Number(value) } : it
      )
    );
  }
  function removeItem(key: string) {
    setItems((prev) => prev!.filter((it) => it.key !== key));
  }

  const totals = items.reduce(
    (a, it) => ({
      kcal: a.kcal + it.kcal,
      protein_g: a.protein_g + it.protein_g,
      carbs_g: a.carbs_g + it.carbs_g,
      fat_g: a.fat_g + it.fat_g,
    }),
    { kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0 }
  );

  return (
    <>
      <div className="rounded-lg border border-amber-300/60 bg-amber-50 p-3 text-xs text-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
        Estimación de la IA. Revisa y ajusta gramos y macros antes de guardar.
      </div>

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
        <Label htmlFor={`${idPrefix}-date`}>Fecha</Label>
        <Input
          id={`${idPrefix}-date`}
          type="date"
          value={logDate}
          max={localToday()}
          onChange={(e) => setLogDate(e.target.value)}
        />
      </div>

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
              <NumCell label="Gramos" value={it.quantity_g} onChange={(v) => setQty(it.key, v)} />
              <NumCell label="Kcal" value={it.kcal} onChange={(v) => setField(it.key, "kcal", String(v))} />
              <NumCell label="Prot." value={it.protein_g} onChange={(v) => setField(it.key, "protein_g", String(v))} />
              <NumCell label="Carbs" value={it.carbs_g} onChange={(v) => setField(it.key, "carbs_g", String(v))} />
              <NumCell label="Grasa" value={it.fat_g} onChange={(v) => setField(it.key, "fat_g", String(v))} />
            </div>
          </li>
        ))}
      </ul>

      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-note`}>Nota (opcional)</Label>
        <Input
          id={`${idPrefix}-note`}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Algo que recordar de esta comida"
        />
      </div>

      <div className="sticky bottom-[calc(5rem+env(safe-area-inset-bottom))] space-y-3 rounded-xl border bg-background/95 p-3 shadow-sm backdrop-blur">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">Total</span>
          <span>
            <span className="font-semibold">{Math.round(totals.kcal)} kcal</span>
            <span className="text-muted-foreground">
              {" "}
              · P {Math.round(totals.protein_g)} · C {Math.round(totals.carbs_g)} · G{" "}
              {Math.round(totals.fat_g)} g
            </span>
          </span>
        </div>
        <Button
          type="button"
          size="lg"
          className="h-11 w-full"
          onClick={onSave}
          disabled={saving || items.length === 0}
        >
          {saving ? "Guardando…" : "Guardar comida"}
        </Button>
      </div>
    </>
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
