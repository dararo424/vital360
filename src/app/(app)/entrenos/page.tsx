import type { Metadata } from "next";
import Link from "next/link";
import { Dumbbell, Plus, SquarePen, Trophy } from "lucide-react";
import {
  computeRecords,
  getWorkouts,
  requireOnboarded,
  type WorkoutWithSets,
} from "@/lib/dal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DeleteWorkoutButton } from "./workout-actions";

export const metadata: Metadata = { title: "Entrenos · Vital360" };

/** Resume los sets de un workout en líneas por ejercicio. */
function summarize(w: WorkoutWithSets): { name: string; detail: string }[] {
  const groups = new Map<string, typeof w.sets>();
  for (const s of w.sets) {
    const name = s.exercise?.name ?? "Ejercicio";
    groups.set(name, [...(groups.get(name) ?? []), s]);
  }
  return [...groups.entries()].map(([name, sets]) => {
    const isCardio = sets[0].exercise?.type === "cardio";
    if (isCardio) {
      const detail = sets
        .map((s) => {
          const min = s.duration_sec ? Math.round(s.duration_sec / 60) : null;
          const km = s.distance_m ? s.distance_m / 1000 : null;
          return [min ? `${min} min` : null, km ? `${km} km` : null]
            .filter(Boolean)
            .join(" · ");
        })
        .filter(Boolean)
        .join("  |  ");
      return { name, detail: detail || `${sets.length} series` };
    }
    const detail = sets
      .map((s) => `${s.reps ?? "—"}×${s.weight_kg ?? 0}kg`)
      .join("  ");
    return { name, detail };
  });
}

export default async function EntrenosPage() {
  await requireOnboarded();
  const workouts = await getWorkouts();
  const records = computeRecords(workouts);

  return (
    <div className="space-y-5">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Entrenos</h1>
        <Button asChild size="sm" className="h-9">
          <Link href="/entrenos/nuevo">
            <Plus /> Nuevo
          </Link>
        </Button>
      </header>

      {records.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Trophy className="size-4 text-amber-500" /> Récords
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="divide-y text-sm">
              {records.slice(0, 6).map((r) => (
                <li key={r.name} className="flex items-center justify-between py-2">
                  <span>{r.name}</span>
                  <span className="text-muted-foreground">
                    {r.maxWeight} kg
                    {r.maxVolume ? ` · vol ${Math.round(r.maxVolume)}` : ""}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {workouts.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <div className="flex size-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <Dumbbell className="size-7" />
          </div>
          <p className="max-w-xs text-sm text-muted-foreground">
            Aún no registras entrenos. Crea tu primer workout con sus series.
          </p>
          <Button asChild className="h-10">
            <Link href="/entrenos/nuevo">
              <Plus /> Nuevo entreno
            </Link>
          </Button>
        </div>
      ) : (
        <ul className="space-y-3">
          {workouts.map((w) => (
            <li key={w.id}>
              <Card>
                <CardContent className="py-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium">{w.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(w.workout_date + "T00:00:00").toLocaleDateString("es", {
                          weekday: "short",
                          day: "numeric",
                          month: "short",
                        })}
                        {w.duration_min ? ` · ${w.duration_min} min` : ""}
                      </p>
                    </div>
                    <div className="flex items-center">
                      <Button asChild variant="ghost" size="icon-sm" aria-label="Editar entreno">
                        <Link href={`/entrenos/${w.id}/editar`}>
                          <SquarePen className="size-4 text-muted-foreground" />
                        </Link>
                      </Button>
                      <DeleteWorkoutButton id={w.id} />
                    </div>
                  </div>
                  <ul className="mt-2 space-y-1 text-sm">
                    {summarize(w).map((g) => (
                      <li key={g.name} className="flex flex-wrap items-baseline gap-x-2">
                        <span className="font-medium">{g.name}</span>
                        <span className="text-xs text-muted-foreground">{g.detail}</span>
                      </li>
                    ))}
                  </ul>
                  {w.note && (
                    <p className="mt-2 text-xs italic text-muted-foreground">{w.note}</p>
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
