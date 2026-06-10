"use client";

import { useRef, useState, useTransition } from "react";
import { Loader2, Search, Trash2, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { updateFoodLog } from "@/app/actions/foods";
import {
  MEAL_TYPES,
  MEAL_TYPE_LABELS,
  round1,
  type Food,
  type MealType,
} from "@/lib/types";
import type { FoodLogFull } from "@/lib/dal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NewFoodDialog } from "../log/new-food-dialog";

type EditItem = {
  key: string;
  food_id: string | null;
  name: string;
  quantity_g: number;
  perGram: { k: number; p: number; c: number; f: number };
  ai_confidence: number | null;
};

let kc = 0;
const k = () => `e${kc++}`;

function fromItem(it: FoodLogFull["items"][number]): EditItem {
  const g = it.quantity_g > 0 ? it.quantity_g : 1;
  return {
    key: k(),
    food_id: it.food_id,
    name: it.name,
    quantity_g: it.quantity_g,
    perGram: { k: it.kcal / g, p: it.protein_g / g, c: it.carbs_g / g, f: it.fat_g / g },
    ai_confidence: it.ai_confidence,
  };
}
function fromFood(food: Food): EditItem {
  const s = food.serving_g > 0 ? food.serving_g : 1;
  return {
    key: k(),
    food_id: food.id,
    name: food.name,
    quantity_g: food.serving_g,
    perGram: { k: food.kcal / s, p: food.protein_g / s, c: food.carbs_g / s, f: food.fat_g / s },
    ai_confidence: null,
  };
}
function macros(it: EditItem) {
  return {
    kcal: Math.round(it.perGram.k * it.quantity_g),
    protein_g: round1(it.perGram.p * it.quantity_g),
    carbs_g: round1(it.perGram.c * it.quantity_g),
    fat_g: round1(it.perGram.f * it.quantity_g),
  };
}

export function EditMealForm({ log }: { log: FoodLogFull }) {
  const [mealType, setMealType] = useState<MealType>(log.meal_type as MealType);
  const [logDate, setLogDate] = useState(log.log_date.slice(0, 10));
  const [note, setNote] = useState(log.note ?? "");
  const [items, setItems] = useState<EditItem[]>(log.items.map(fromItem));

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Food[]>([]);
  const [searching, setSearching] = useState(false);
  const seq = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [saving, startSave] = useTransition();

  function onQueryChange(v: string) {
    setQuery(v);
    if (timer.current) clearTimeout(timer.current);
    const q = v.trim();
    if (q.length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    const id = ++seq.current;
    timer.current = setTimeout(async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("foods")
        .select("*")
        .ilike("name", `%${q}%`)
        .order("name")
        .limit(10);
      if (id !== seq.current) return;
      setResults((data as Food[]) ?? []);
      setSearching(false);
    }, 300);
  }
  function addFood(food: Food) {
    setItems((p) => [...p, fromFood(food)]);
    setQuery("");
    setResults([]);
  }
  function setQty(key: string, g: number) {
    setItems((p) => p.map((it) => (it.key === key ? { ...it, quantity_g: Math.max(0, g) } : it)));
  }
  function setName(key: string, name: string) {
    setItems((p) => p.map((it) => (it.key === key ? { ...it, name } : it)));
  }
  function removeItem(key: string) {
    setItems((p) => p.filter((it) => it.key !== key));
  }

  const totals = items.reduce(
    (a, it) => {
      const m = macros(it);
      return {
        kcal: a.kcal + m.kcal,
        protein_g: a.protein_g + m.protein_g,
        carbs_g: a.carbs_g + m.carbs_g,
        fat_g: a.fat_g + m.fat_g,
      };
    },
    { kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0 }
  );

  function save() {
    setError(null);
    if (items.length === 0) return setError("Debe quedar al menos un alimento.");
    startSave(async () => {
      const res = await updateFoodLog(log.id, {
        meal_type: mealType,
        log_date: logDate,
        note,
        items: items.map((it) => {
          const m = macros(it);
          return {
            food_id: it.food_id,
            name: it.name,
            quantity_g: it.quantity_g,
            ai_confidence: it.ai_confidence,
            ...m,
          };
        }),
      });
      if (res && !res.ok) setError(res.error);
    });
  }

  return (
    <div className="space-y-5">
      {/* Tipo de comida */}
      <div className="space-y-2">
        <Label>Comida</Label>
        <div className="grid grid-cols-4 gap-2">
          {MEAL_TYPES.map((m) => (
            <Button key={m} type="button" variant={mealType === m ? "default" : "outline"} size="sm" className="h-9" onClick={() => setMealType(m)}>
              {MEAL_TYPE_LABELS[m]}
            </Button>
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="edate">Fecha</Label>
        <Input id="edate" type="date" value={logDate} onChange={(e) => setLogDate(e.target.value)} />
      </div>

      {/* Ítems */}
      <div className="space-y-2">
        <Label>Alimentos ({items.length})</Label>
        <ul className="space-y-2">
          {items.map((it) => {
            const m = macros(it);
            return (
              <li key={it.key} className="rounded-lg border bg-card p-3">
                <div className="flex items-center gap-2">
                  <Input value={it.name} onChange={(e) => setName(it.key, e.target.value)} className="h-8 font-medium" />
                  <button type="button" onClick={() => removeItem(it.key)} aria-label="Quitar" className="text-muted-foreground hover:text-destructive">
                    <Trash2 className="size-4" />
                  </button>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <Input type="number" inputMode="decimal" value={String(it.quantity_g)} onChange={(e) => setQty(it.key, Number(e.target.value))} className="h-8 w-24" />
                  <span className="text-sm text-muted-foreground">g</span>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {m.kcal} kcal · P {m.protein_g} · C {m.carbs_g} · G {m.fat_g}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Agregar alimento */}
      <div className="space-y-2">
        <Label>Agregar alimento</Label>
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(e) => onQueryChange(e.target.value)} placeholder="Buscar en tu catálogo…" className="pl-8" />
          {searching && <Loader2 className="absolute right-2.5 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />}
        </div>
        {query.trim().length >= 2 && results.length > 0 && (
          <div className="rounded-lg border p-1.5">
            <ul className="max-h-48 overflow-auto">
              {results.map((f) => (
                <li key={f.id}>
                  <button type="button" onClick={() => addFood(f)} className="flex w-full items-center justify-between rounded-md px-2.5 py-2 text-left text-sm hover:bg-muted">
                    <span className="truncate">{f.name}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">{f.kcal} kcal/{f.serving_g}g</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
        <NewFoodDialog initialName={query.trim()} onCreated={addFood} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="enote">Nota</Label>
        <Input id="enote" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Opcional" />
      </div>

      <div className="sticky bottom-20 space-y-3 rounded-xl border bg-background/95 p-3 shadow-sm backdrop-blur">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">Total</span>
          <span>
            <span className="font-semibold">{totals.kcal} kcal</span>
            <span className="text-muted-foreground"> · P {Math.round(totals.protein_g)} · C {Math.round(totals.carbs_g)} · G {Math.round(totals.fat_g)} g</span>
          </span>
        </div>
        {error && <p className="flex items-center gap-1.5 text-sm text-destructive"><X className="size-4" /> {error}</p>}
        <Button type="button" size="lg" className="h-11 w-full" onClick={save} disabled={saving || items.length === 0}>
          {saving ? "Guardando…" : "Guardar cambios"}
        </Button>
      </div>
    </div>
  );
}
