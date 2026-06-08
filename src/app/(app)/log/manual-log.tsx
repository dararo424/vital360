"use client";

import { useRef, useState, useTransition } from "react";
import { Loader2, Search, Trash2, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { logMeal } from "@/app/actions/foods";
import {
  MEAL_TYPES,
  MEAL_TYPE_LABELS,
  scaleFood,
  type Food,
  type MealType,
} from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NewFoodDialog } from "./new-food-dialog";

type DraftItem = { key: string; food: Food; quantity_g: number };

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

export function ManualLog() {
  const [mealType, setMealType] = useState<MealType>(defaultMeal);
  const [logDate, setLogDate] = useState(localToday);
  const [note, setNote] = useState("");
  const [items, setItems] = useState<DraftItem[]>([]);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Food[]>([]);
  const [searching, setSearching] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const seq = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Búsqueda en vivo (debounced) sobre foods (RLS: propios + globales).
  // Se hace en el handler del input (no en un efecto) para evitar renders en cascada.
  function onQueryChange(value: string) {
    setQuery(value);
    if (timer.current) clearTimeout(timer.current);
    const q = value.trim();
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
        .limit(12);
      if (id !== seq.current) return; // resultado obsoleto
      setResults((data as Food[]) ?? []);
      setSearching(false);
    }, 300);
  }

  function addFood(food: Food) {
    setItems((prev) => [
      ...prev,
      { key: `${food.id}-${prev.length}-${Date.now()}`, food, quantity_g: food.serving_g },
    ]);
    setQuery("");
    setResults([]);
  }

  function setQty(key: string, grams: number) {
    setItems((prev) =>
      prev.map((it) =>
        it.key === key ? { ...it, quantity_g: Math.max(0, grams) } : it
      )
    );
  }

  function removeItem(key: string) {
    setItems((prev) => prev.filter((it) => it.key !== key));
  }

  const totals = items.reduce(
    (acc, it) => {
      const m = scaleFood(it.food, it.quantity_g);
      acc.kcal += m.kcal;
      acc.protein_g += m.protein_g;
      acc.carbs_g += m.carbs_g;
      acc.fat_g += m.fat_g;
      return acc;
    },
    { kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0 }
  );

  function save() {
    setError(null);
    if (items.length === 0) {
      setError("Agrega al menos un alimento.");
      return;
    }
    const payload = {
      meal_type: mealType,
      log_date: logDate,
      note,
      source: "manual" as const,
      items: items.map((it) => {
        const m = scaleFood(it.food, it.quantity_g);
        return {
          food_id: it.food.id,
          name: it.food.name,
          quantity_g: it.quantity_g,
          ...m,
        };
      }),
    };
    startTransition(async () => {
      const res = await logMeal(payload);
      // En éxito logMeal hace redirect; solo llega aquí si hubo error.
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

      {/* Fecha */}
      <div className="space-y-1.5">
        <Label htmlFor="log_date">Fecha</Label>
        <Input
          id="log_date"
          type="date"
          value={logDate}
          max={localToday()}
          onChange={(e) => setLogDate(e.target.value)}
        />
      </div>

      {/* Buscador */}
      <div className="space-y-2">
        <Label htmlFor="food-search">Buscar alimento</Label>
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="food-search"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Ej. arroz, pollo, manzana…"
            className="pl-8"
          />
          {searching && (
            <Loader2 className="absolute right-2.5 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
          )}
        </div>

        {query.trim().length >= 2 && (
          <Card>
            <CardContent className="p-1.5">
              {results.length > 0 ? (
                <ul className="max-h-60 overflow-auto">
                  {results.map((f) => (
                    <li key={f.id}>
                      <button
                        type="button"
                        onClick={() => addFood(f)}
                        className="flex w-full items-center justify-between rounded-md px-2.5 py-2 text-left text-sm hover:bg-muted"
                      >
                        <span>
                          {f.name}
                          {f.brand && (
                            <span className="text-muted-foreground"> · {f.brand}</span>
                          )}
                        </span>
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {f.kcal} kcal/{f.serving_g}g
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                !searching && (
                  <p className="px-2.5 py-3 text-sm text-muted-foreground">
                    Sin resultados para “{query.trim()}”. Créalo abajo.
                  </p>
                )
              )}
            </CardContent>
          </Card>
        )}

        <NewFoodDialog initialName={query.trim()} onCreated={addFood} />
      </div>

      {/* Ítems agregados */}
      {items.length > 0 && (
        <div className="space-y-2">
          <Label>Alimentos ({items.length})</Label>
          <ul className="space-y-2">
            {items.map((it) => {
              const m = scaleFood(it.food, it.quantity_g);
              return (
                <li
                  key={it.key}
                  className="rounded-lg border bg-card p-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{it.food.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {m.kcal} kcal · P {m.protein_g} · C {m.carbs_g} · G{" "}
                        {m.fat_g} g
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeItem(it.key)}
                      aria-label="Quitar"
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <Input
                      type="number"
                      inputMode="decimal"
                      value={String(it.quantity_g)}
                      onChange={(e) => setQty(it.key, Number(e.target.value))}
                      className="h-8 w-24"
                    />
                    <span className="text-sm text-muted-foreground">gramos</span>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Nota */}
      <div className="space-y-1.5">
        <Label htmlFor="note">Nota (opcional)</Label>
        <Input
          id="note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Algo que recordar de esta comida"
        />
      </div>

      {/* Totales + guardar */}
      <div className="sticky bottom-20 space-y-3 rounded-xl border bg-background/95 p-3 shadow-sm backdrop-blur">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">Total</span>
          <span>
            <span className="font-semibold">{totals.kcal} kcal</span>
            <span className="text-muted-foreground">
              {" "}
              · P {Math.round(totals.protein_g)} · C {Math.round(totals.carbs_g)} ·
              G {Math.round(totals.fat_g)} g
            </span>
          </span>
        </div>

        {error && (
          <p className="flex items-center gap-1.5 text-sm text-destructive">
            <X className="size-4" /> {error}
          </p>
        )}

        <Button
          type="button"
          size="lg"
          className={cn("h-11 w-full")}
          onClick={save}
          disabled={pending || items.length === 0}
        >
          {pending ? "Guardando…" : "Guardar comida"}
        </Button>
      </div>
    </div>
  );
}
