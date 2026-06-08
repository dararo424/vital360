"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  Plus,
  Search,
  ShoppingCart,
  Trash2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  addPlanEntry,
  generateGroceryList,
  removePlanEntry,
} from "@/app/actions/plan";
import type { PlanEntry } from "@/lib/dal";
import {
  MEAL_TYPES,
  MEAL_TYPE_LABELS,
  type Food,
  type MealType,
} from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type RecipeLite = { id: string; title: string; kcal: number };

const DAY_NAMES = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

function shiftWeek(weekStart: string, deltaDays: number): string {
  const d = new Date(weekStart + "T00:00:00");
  d.setDate(d.getDate() + deltaDays);
  return d.toISOString().slice(0, 10);
}

export function Planner({
  weekStart,
  days,
  goalKcal,
  entries,
  recipes,
}: {
  weekStart: string;
  days: string[];
  goalKcal: number;
  entries: PlanEntry[];
  recipes: RecipeLite[];
}) {
  const router = useRouter();
  const [slot, setSlot] = useState<{ date: string; meal: MealType } | null>(null);
  const [generating, startGenerate] = useTransition();
  const [genError, setGenError] = useState<string | null>(null);

  function go(delta: number) {
    router.push(`/plan?week=${shiftWeek(weekStart, delta * 7)}`);
  }

  const byKey = new Map<string, PlanEntry[]>();
  for (const e of entries) {
    const k = `${e.entry_date}|${e.meal_type}`;
    byKey.set(k, [...(byKey.get(k) ?? []), e]);
  }
  const dayTotal = (date: string) =>
    entries
      .filter((e) => e.entry_date === date)
      .reduce((s, e) => s + e.macros.kcal, 0);

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Plan semanal</h1>
        <Button
          size="sm"
          className="h-9"
          disabled={generating}
          onClick={() => {
            setGenError(null);
            startGenerate(async () => {
              const res = await generateGroceryList(weekStart);
              if (!res.ok) setGenError(res.error ?? "Error");
            });
          }}
        >
          {generating ? <Loader2 className="animate-spin" /> : <ShoppingCart />}
          Lista
        </Button>
      </header>

      {/* Navegación de semana */}
      <div className="flex items-center justify-between rounded-lg border p-1.5">
        <Button variant="ghost" size="icon-sm" onClick={() => go(-1)} aria-label="Semana anterior">
          <ChevronLeft />
        </Button>
        <span className="text-sm font-medium">
          Semana del {new Date(weekStart + "T00:00:00").toLocaleDateString("es", { day: "numeric", month: "short" })}
        </span>
        <Button variant="ghost" size="icon-sm" onClick={() => go(1)} aria-label="Semana siguiente">
          <ChevronRight />
        </Button>
      </div>

      {genError && <p className="text-sm text-destructive">{genError}</p>}

      {/* Días */}
      <div className="space-y-3">
        {days.map((date, i) => {
          const total = dayTotal(date);
          const over = goalKcal > 0 && total > goalKcal;
          return (
            <div key={date} className="rounded-xl border">
              <div className="flex items-center justify-between border-b px-3 py-2">
                <span className="text-sm font-medium">
                  {DAY_NAMES[i]}{" "}
                  <span className="text-muted-foreground">
                    {new Date(date + "T00:00:00").getDate()}
                  </span>
                </span>
                {goalKcal > 0 && (
                  <span className={`text-xs ${over ? "text-red-500" : "text-muted-foreground"}`}>
                    {total} / {goalKcal} kcal
                  </span>
                )}
              </div>
              <div className="divide-y">
                {MEAL_TYPES.map((meal) => {
                  const list = byKey.get(`${date}|${meal}`) ?? [];
                  return (
                    <div key={meal} className="flex items-start gap-2 px-3 py-2">
                      <span className="w-16 shrink-0 pt-1 text-xs font-medium text-muted-foreground">
                        {MEAL_TYPE_LABELS[meal]}
                      </span>
                      <div className="min-w-0 flex-1 space-y-1">
                        {list.map((e) => (
                          <div key={e.id} className="flex items-center justify-between gap-2 rounded-md bg-muted/50 px-2 py-1">
                            <span className="truncate text-sm">
                              {e.label}
                              {e.servings !== 1 && (
                                <span className="text-muted-foreground"> ×{e.servings}</span>
                              )}
                            </span>
                            <span className="flex items-center gap-1.5">
                              <span className="shrink-0 text-xs text-muted-foreground">{e.macros.kcal} kcal</span>
                              <button
                                type="button"
                                aria-label="Quitar"
                                onClick={() => removePlanEntry(e.id).then(() => router.refresh())}
                                className="text-muted-foreground hover:text-destructive"
                              >
                                <Trash2 className="size-3.5" />
                              </button>
                            </span>
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={() => setSlot({ date, meal })}
                          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary"
                        >
                          <Plus className="size-3.5" /> Agregar
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <AddDialog
        slot={slot}
        weekStart={weekStart}
        recipes={recipes}
        onClose={() => setSlot(null)}
        onAdded={() => {
          setSlot(null);
          router.refresh();
        }}
      />
    </div>
  );
}

function AddDialog({
  slot,
  weekStart,
  recipes,
  onClose,
  onAdded,
}: {
  slot: { date: string; meal: MealType } | null;
  weekStart: string;
  recipes: RecipeLite[];
  onClose: () => void;
  onAdded: () => void;
}) {
  const [servings, setServings] = useState("1");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Food[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const seq = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  function add(opts: { recipe_id?: string; food_id?: string }) {
    if (!slot) return;
    setError(null);
    start(async () => {
      const res = await addPlanEntry({
        week_start: weekStart,
        entry_date: slot.date,
        meal_type: slot.meal,
        recipe_id: opts.recipe_id ?? null,
        food_id: opts.food_id ?? null,
        servings: Math.max(1, Number(servings) || 1),
      });
      if (!res.ok) {
        setError(res.error ?? "Error");
        return;
      }
      setQuery("");
      setResults([]);
      setServings("1");
      onAdded();
    });
  }

  return (
    <Dialog open={slot !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Agregar a {slot ? MEAL_TYPE_LABELS[slot.meal] : ""}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Label htmlFor="srv" className="shrink-0">
              Porciones
            </Label>
            <Input
              id="srv"
              type="number"
              inputMode="numeric"
              value={servings}
              onChange={(e) => setServings(e.target.value)}
              className="h-8 w-20"
            />
          </div>

          <Tabs defaultValue="recetas">
            <TabsList className="w-full">
              <TabsTrigger value="recetas" className="flex-1">
                Recetas
              </TabsTrigger>
              <TabsTrigger value="alimento" className="flex-1">
                Alimento
              </TabsTrigger>
            </TabsList>

            <TabsContent value="recetas" className="mt-3">
              {recipes.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  No tienes recetas todavía.
                </p>
              ) : (
                <ul className="max-h-60 space-y-1 overflow-auto">
                  {recipes.map((r) => (
                    <li key={r.id}>
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => add({ recipe_id: r.id })}
                        className="flex w-full items-center justify-between rounded-md border px-2.5 py-2 text-left text-sm hover:bg-muted disabled:opacity-50"
                      >
                        <span className="truncate">{r.title}</span>
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {r.kcal} kcal/porc.
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </TabsContent>

            <TabsContent value="alimento" className="mt-3 space-y-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => onQueryChange(e.target.value)}
                  placeholder="Buscar alimento…"
                  className="pl-8"
                />
                {searching && (
                  <Loader2 className="absolute right-2.5 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
                )}
              </div>
              {query.trim().length >= 2 && (
                <ul className="max-h-52 space-y-1 overflow-auto">
                  {results.map((f) => (
                    <li key={f.id}>
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => add({ food_id: f.id })}
                        className="flex w-full items-center justify-between rounded-md border px-2.5 py-2 text-left text-sm hover:bg-muted disabled:opacity-50"
                      >
                        <span className="truncate">{f.name}</span>
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {f.kcal} kcal/{f.serving_g}g
                        </span>
                      </button>
                    </li>
                  ))}
                  {!searching && results.length === 0 && (
                    <li className="px-2.5 py-3 text-sm text-muted-foreground">
                      Sin resultados.
                    </li>
                  )}
                </ul>
              )}
              <p className="text-xs text-muted-foreground">
                1 porción = {servings === "1" ? "una" : servings} ración(es) del
                tamaño del alimento.
              </p>
            </TabsContent>
          </Tabs>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
      </DialogContent>
    </Dialog>
  );
}
