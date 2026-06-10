import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Trophy } from "lucide-react";
import { getExerciseHistory, requireOnboarded } from "@/lib/dal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ExerciseChart } from "./exercise-chart";

export const metadata: Metadata = { title: "Ejercicio · Vital360" };

export default async function ExercisePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireOnboarded();
  const { id } = await params;
  const h = await getExerciseHistory(id);
  if (!h) notFound();

  const isCardio = h.type === "cardio";
  const weights = h.sessions.map((s) => s.maxWeight).filter((w): w is number => w != null);
  const best = weights.length ? Math.max(...weights) : null;
  const recent = [...h.sessions].reverse();

  return (
    <div className="space-y-5">
      <Link
        href="/entrenos"
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" /> Entrenos
      </Link>

      <header>
        <h1 className="text-2xl font-semibold tracking-tight">{h.name}</h1>
        <p className="text-sm text-muted-foreground">
          {h.sessions.length} sesión{h.sessions.length === 1 ? "" : "es"}
          {best != null && ` · récord ${best} kg`}
        </p>
      </header>

      {!isCardio && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Trophy className="size-4 text-amber-500" /> Progresión (mejor peso)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ExerciseChart data={h.sessions} />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Sesiones</CardTitle>
        </CardHeader>
        <CardContent>
          {recent.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin registros aún.</p>
          ) : (
            <ul className="divide-y text-sm">
              {recent.map((s, i) => (
                <li key={i} className="flex items-center justify-between py-2">
                  <span>
                    {new Date(s.date + "T00:00:00").toLocaleDateString("es", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                  <span className="text-muted-foreground">
                    {s.sets} serie{s.sets === 1 ? "" : "s"}
                    {s.maxWeight != null && ` · máx ${s.maxWeight} kg`}
                    {s.volume > 0 && ` · vol ${Math.round(s.volume)}`}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
