"use client";

import { useRef, useState, useTransition } from "react";
import { Loader2, Search, Sparkles, Trash2, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { createRecipe, updateRecipe, suggestRecipe } from "@/app/actions/recipes";
import {
  RECIPE_TAGS,
  RECIPE_TAG_LABELS,
  round1,
  type Food,
  type Macros,
  type SuggestedRecipe,
} from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NewFoodDialog } from "../log/new-food-dialog";

type EdIng = {
  key: string;
  food_id: string | null;
  name: string;
  quantity_g: number;
  perGram: { k: number; p: number; c: number; f: number };
};

export type RecipeInitial = {
  title: string;
  servings: number;
  prep_minutes: number | null;
  instructions: string | null;
  tags: string[];
  ingredients: {
    food_id: string | null;
    name: string;
    quantity_g: number;
    perServing: { kcal: number; protein_g: number; carbs_g: number; fat_g: number };
  }[];
};

let keyCounter = 0;
const nextKey = () => `ing-${keyCounter++}`;

function foodToIng(food: Food, grams: number): EdIng {
  const s = food.serving_g > 0 ? food.serving_g : 1;
  return {
    key: nextKey(),
    food_id: food.id,
    name: food.name,
    quantity_g: grams,
    perGram: {
      k: food.kcal / s,
      p: food.protein_g / s,
      c: food.carbs_g / s,
      f: food.fat_g / s,
    },
  };
}

function adhocToIng(
  name: string,
  grams: number,
  m: { kcal: number; protein_g: number; carbs_g: number; fat_g: number }
): EdIng {
  const g = grams > 0 ? grams : 1;
  return {
    key: nextKey(),
    food_id: null,
    name,
    quantity_g: grams,
    perGram: { k: m.kcal / g, p: m.protein_g / g, c: m.carbs_g / g, f: m.fat_g / g },
  };
}

function ingMacros(it: EdIng): Macros {
  return {
    kcal: Math.round(it.perGram.k * it.quantity_g),
    protein_g: round1(it.perGram.p * it.quantity_g),
    carbs_g: round1(it.perGram.c * it.quantity_g),
    fat_g: round1(it.perGram.f * it.quantity_g),
  };
}

export function RecipeEditor({
  recipeId,
  initial,
  remaining,
}: {
  recipeId?: string;
  initial?: RecipeInitial;
  remaining?: Macros | null;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [servings, setServings] = useState(String(initial?.servings ?? 1));
  const [prep, setPrep] = useState(
    initial?.prep_minutes != null ? String(initial.prep_minutes) : ""
  );
  const [instructions, setInstructions] = useState(initial?.instructions ?? "");
  const [tags, setTags] = useState<string[]>(initial?.tags ?? []);
  const [customTag, setCustomTag] = useState("");
  const [items, setItems] = useState<EdIng[]>(
    initial
      ? initial.ingredients.map((i) => ({
          ...adhocToIng(i.name, i.quantity_g, i.perServing),
          food_id: i.food_id,
        }))
      : []
  );

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Food[]>([]);
  const [searching, setSearching] = useState(false);
  const seq = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [suggesting, startSuggest] = useTransition();
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
    setItems((p) => [...p, foodToIng(food, food.serving_g)]);
    setQuery("");
    setResults([]);
  }
  function setQty(key: string, g: number) {
    setItems((p) =>
      p.map((it) => (it.key === key ? { ...it, quantity_g: Math.max(0, g) } : it))
    );
  }
  function removeItem(key: string) {
    setItems((p) => p.filter((it) => it.key !== key));
  }
  function toggleTag(t: string) {
    setTags((p) => (p.includes(t) ? p.filter((x) => x !== t) : [...p, t]));
  }
  function addCustomTag() {
    const t = customTag.trim().toLowerCase().replace(/\s+/g, "_");
    if (t && !tags.includes(t)) setTags((p) => [...p, t]);
    setCustomTag("");
  }

  const nServings = Math.max(1, Number(servings) || 1);
  const total = items.reduce<Macros>(
    (a, it) => {
      const m = ingMacros(it);
      return {
        kcal: a.kcal + m.kcal,
        protein_g: a.protein_g + m.protein_g,
        carbs_g: a.carbs_g + m.carbs_g,
        fat_g: a.fat_g + m.fat_g,
      };
    },
    { kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0 }
  );
  const per = {
    kcal: Math.round(total.kcal / nServings),
    protein_g: round1(total.protein_g / nServings),
    carbs_g: round1(total.carbs_g / nServings),
    fat_g: round1(total.fat_g / nServings),
  };

  function doSuggest() {
    setError(null);
    startSuggest(async () => {
      const res = await suggestRecipe(notes || undefined);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      applySuggestion(res.recipe);
    });
  }

  function applySuggestion(r: SuggestedRecipe) {
    setTitle(r.title);
    setServings(String(r.servings));
    setPrep(r.prep_minutes != null ? String(r.prep_minutes) : "");
    setInstructions(r.instructions);
    setTags(r.tags ?? []);
    setItems(
      r.ingredients.map((i) =>
        adhocToIng(i.name, i.quantity_g, {
          kcal: i.kcal,
          protein_g: i.protein_g,
          carbs_g: i.carbs_g,
          fat_g: i.fat_g,
        })
      )
    );
  }

  function save() {
    setError(null);
    if (!title.trim()) return setError("Ponle un título.");
    if (items.length === 0) return setError("Agrega al menos un ingrediente.");
    const payload = {
      title,
      servings: nServings,
      prep_minutes: prep ? Number(prep) : undefined,
      instructions,
      tags,
      ingredients: items.map((it) => {
        const m = ingMacros(it);
        return {
          food_id: it.food_id,
          name: it.name,
          quantity_g: it.quantity_g,
          ...m,
        };
      }),
    };
    startSave(async () => {
      const res = recipeId
        ? await updateRecipe(recipeId, payload)
        : await createRecipe(payload);
      if (res && !res.ok) setError(res.error);
    });
  }

  return (
    <div className="space-y-5">
      {/* Sugerir con IA (solo al crear) */}
      {!recipeId && remaining && (
        <div className="space-y-2 rounded-xl border border-primary/30 bg-primary/5 p-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Sparkles className="size-4 text-primary" /> Sugerir con IA
          </div>
          <p className="text-xs text-muted-foreground">
            Propondrá una receta dentro de tus macros restantes de hoy (
            {remaining.kcal} kcal · P {remaining.protein_g} · C {remaining.carbs_g}{" "}
            · G {remaining.fat_g} g). Edítala antes de guardar.
          </p>
          <div className="flex gap-2">
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Preferencias (ej. vegetariano, con pollo…)"
            />
            <Button type="button" onClick={doSuggest} disabled={suggesting} className="h-8 shrink-0">
              {suggesting ? <Loader2 className="animate-spin" /> : <Sparkles />}
              Sugerir
            </Button>
          </div>
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="title">Título</Label>
        <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Bowl de pollo y arroz" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="servings">Porciones</Label>
          <Input id="servings" type="number" inputMode="numeric" value={servings} onChange={(e) => setServings(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="prep">Prep (min)</Label>
          <Input id="prep" type="number" inputMode="numeric" value={prep} onChange={(e) => setPrep(e.target.value)} placeholder="20" />
        </div>
      </div>

      {/* Tags */}
      <div className="space-y-2">
        <Label>Tags</Label>
        <div className="flex flex-wrap gap-1.5">
          {RECIPE_TAGS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => toggleTag(t)}
              className={cn(
                "rounded-full border px-2.5 py-1 text-xs transition-colors",
                tags.includes(t)
                  ? "border-primary bg-primary text-primary-foreground"
                  : "hover:bg-muted"
              )}
            >
              {RECIPE_TAG_LABELS[t] ?? t}
            </button>
          ))}
          {tags
            .filter((t) => !RECIPE_TAGS.includes(t as (typeof RECIPE_TAGS)[number]))
            .map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => toggleTag(t)}
                className="rounded-full border border-primary bg-primary px-2.5 py-1 text-xs text-primary-foreground"
              >
                {t} ✕
              </button>
            ))}
        </div>
        <div className="flex gap-2">
          <Input
            value={customTag}
            onChange={(e) => setCustomTag(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addCustomTag();
              }
            }}
            placeholder="Tag personalizado"
            className="h-8"
          />
          <Button type="button" variant="outline" className="h-8 shrink-0" onClick={addCustomTag}>
            Agregar
          </Button>
        </div>
      </div>

      {/* Ingredientes */}
      <div className="space-y-2">
        <Label>Ingredientes</Label>
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(e) => onQueryChange(e.target.value)} placeholder="Buscar alimento…" className="pl-8" />
          {searching && <Loader2 className="absolute right-2.5 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />}
        </div>
        {query.trim().length >= 2 && (
          <div className="rounded-lg border p-1.5">
            {results.length > 0 ? (
              <ul className="max-h-52 overflow-auto">
                {results.map((f) => (
                  <li key={f.id}>
                    <button type="button" onClick={() => addFood(f)} className="flex w-full items-center justify-between rounded-md px-2.5 py-2 text-left text-sm hover:bg-muted">
                      <span>{f.name}{f.brand && <span className="text-muted-foreground"> · {f.brand}</span>}</span>
                      <span className="shrink-0 text-xs text-muted-foreground">{f.kcal} kcal/{f.serving_g}g</span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              !searching && <p className="px-2.5 py-3 text-sm text-muted-foreground">Sin resultados. Créalo abajo.</p>
            )}
          </div>
        )}
        <NewFoodDialog initialName={query.trim()} onCreated={addFood} />

        {items.length > 0 && (
          <ul className="space-y-2 pt-1">
            {items.map((it) => {
              const m = ingMacros(it);
              return (
                <li key={it.key} className="rounded-lg border bg-card p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{it.name}</p>
                      <p className="text-xs text-muted-foreground">{m.kcal} kcal · P {m.protein_g} · C {m.carbs_g} · G {m.fat_g} g</p>
                    </div>
                    <button type="button" onClick={() => removeItem(it.key)} aria-label="Quitar" className="text-muted-foreground hover:text-destructive">
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <Input type="number" inputMode="decimal" value={String(it.quantity_g)} onChange={(e) => setQty(it.key, Number(e.target.value))} className="h-8 w-24" />
                    <span className="text-sm text-muted-foreground">gramos</span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Instrucciones */}
      <div className="space-y-1.5">
        <Label htmlFor="instructions">Instrucciones</Label>
        <textarea
          id="instructions"
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          rows={4}
          placeholder="Pasos de preparación…"
          className="w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
        />
      </div>

      {/* Macros por porción + guardar */}
      <div className="sticky bottom-20 space-y-3 rounded-xl border bg-background/95 p-3 shadow-sm backdrop-blur">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">Por porción</span>
          <span>
            <span className="font-semibold">{per.kcal} kcal</span>
            <span className="text-muted-foreground"> · P {per.protein_g} · C {per.carbs_g} · G {per.fat_g} g</span>
          </span>
        </div>
        {error && (
          <p className="flex items-center gap-1.5 text-sm text-destructive"><X className="size-4" /> {error}</p>
        )}
        <Button type="button" size="lg" className="h-11 w-full" onClick={save} disabled={saving}>
          {saving ? "Guardando…" : recipeId ? "Guardar cambios" : "Crear receta"}
        </Button>
      </div>
    </div>
  );
}
