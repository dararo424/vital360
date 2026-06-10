import type { Metadata } from "next";
import Link from "next/link";
import { Camera, Pencil, Plus, SquarePen, UtensilsCrossed } from "lucide-react";
import {
  getActiveGoal,
  getFoodLogs,
  requireOnboarded,
  today as todayFn,
} from "@/lib/dal";
import { MEAL_TYPE_LABELS, type MealType } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DateNav } from "./date-nav";
import { DeleteMealButton, RepeatMealButton } from "./meal-actions";

export const metadata: Metadata = { title: "Diario · Vital360" };

const MEAL_ORDER = ["desayuno", "almuerzo", "cena", "snack", "otro"];

export default async function DiarioPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  await requireOnboarded();
  const { date } = await searchParams;
  const day =
    date && !Number.isNaN(Date.parse(date)) ? date.slice(0, 10) : todayFn();

  const [meals, goal] = await Promise.all([getFoodLogs(day), getActiveGoal()]);

  const sorted = [...meals].sort(
    (a, b) => MEAL_ORDER.indexOf(a.meal_type) - MEAL_ORDER.indexOf(b.meal_type)
  );
  const dayTotal = meals.reduce(
    (a, m) => ({
      kcal: a.kcal + m.totals.kcal,
      protein_g: a.protein_g + m.totals.protein_g,
      carbs_g: a.carbs_g + m.totals.carbs_g,
      fat_g: a.fat_g + m.totals.fat_g,
    }),
    { kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0 }
  );

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Diario</h1>
        <Button asChild size="sm" className="h-9">
          <Link href="/log">
            <Plus /> Registrar
          </Link>
        </Button>
      </header>

      <DateNav date={day} />

      {/* Total del día */}
      {goal && (
        <Card>
          <CardContent className="py-3">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Total del día</span>
              <span>
                <span className="font-semibold">{Math.round(dayTotal.kcal)}</span>
                <span className="text-muted-foreground"> / {goal.kcal_target} kcal</span>
              </span>
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              P {Math.round(dayTotal.protein_g)}/{goal.protein_g} · C{" "}
              {Math.round(dayTotal.carbs_g)}/{goal.carbs_g} · G{" "}
              {Math.round(dayTotal.fat_g)}/{goal.fat_g} g
            </p>
          </CardContent>
        </Card>
      )}

      {sorted.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <div className="flex size-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <UtensilsCrossed className="size-7" />
          </div>
          <p className="max-w-xs text-sm text-muted-foreground">
            No registraste comidas este día.
          </p>
          <Button asChild className="h-10">
            <Link href="/log">
              <Plus /> Registrar comida
            </Link>
          </Button>
        </div>
      ) : (
        <ul className="space-y-3">
          {sorted.map((m) => (
            <li key={m.id}>
              <Card>
                <CardContent className="py-3">
                  <div className="flex items-center justify-between">
                    <p className="flex items-center gap-1.5 font-medium">
                      {MEAL_TYPE_LABELS[m.meal_type as MealType] ?? m.meal_type}
                      {m.source === "foto" ? (
                        <Camera className="size-3.5 text-muted-foreground" />
                      ) : (
                        <Pencil className="size-3.5 text-muted-foreground" />
                      )}
                    </p>
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-semibold">{m.totals.kcal} kcal</span>
                      <RepeatMealButton id={m.id} />
                      <Button asChild variant="ghost" size="icon-sm" aria-label="Editar comida">
                        <Link href={`/diario/${m.id}/editar`}>
                          <SquarePen className="size-4 text-muted-foreground" />
                        </Link>
                      </Button>
                      <DeleteMealButton id={m.id} />
                    </div>
                  </div>
                  <ul className="mt-1.5 space-y-0.5 text-sm">
                    {m.items.map((it) => (
                      <li key={it.id} className="flex justify-between">
                        <span className="truncate">
                          {it.name}{" "}
                          <span className="text-muted-foreground">· {it.quantity_g} g</span>
                        </span>
                        <span className="shrink-0 text-muted-foreground">{it.kcal} kcal</span>
                      </li>
                    ))}
                  </ul>
                  {m.note && (
                    <p className="mt-1.5 text-xs italic text-muted-foreground">{m.note}</p>
                  )}
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
