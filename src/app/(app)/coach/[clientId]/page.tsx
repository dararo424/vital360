import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Camera, ChevronLeft, Flame, Target } from "lucide-react";
import { requireOnboarded } from "@/lib/dal";
import { getClientSummary } from "@/app/actions/coach";
import { OBJECTIVE_LABELS, type Objective } from "@/lib/nutrition-plan";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCoachNotes } from "@/app/actions/coach";
import { NotesThread } from "@/components/notes-thread";
import { SetGoalForm } from "./set-goal-form";
import { ClientWeightChart } from "./client-weight-chart";
import { ClientKcalChart } from "./client-kcal-chart";

export const metadata: Metadata = { title: "Cliente · Vital360" };

export default async function ClientPage({
  params,
}: {
  params: Promise<{ clientId: string }>;
}) {
  await requireOnboarded();
  const { clientId } = await params;
  const s = await getClientSummary(clientId);
  if (!s) notFound();
  const notes = await getCoachNotes(clientId);

  const objLabel = s.objective
    ? OBJECTIVE_LABELS[s.objective as Objective] ?? s.objective
    : null;

  return (
    <div className="space-y-5">
      <Link
        href="/coach"
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" /> Mis clientes
      </Link>

      <header>
        <h1 className="text-2xl font-semibold tracking-tight">{s.name}</h1>
        {objLabel && <p className="text-sm text-muted-foreground">{objLabel}</p>}
      </header>

      {/* Resumen */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="py-4">
            <p className="text-xs text-muted-foreground">Peso actual</p>
            <p className="text-xl font-semibold">
              {s.currentWeight != null ? `${s.currentWeight} kg` : "—"}
            </p>
            {s.deltaWeight != null && (
              <p className={`text-xs ${s.deltaWeight <= 0 ? "text-emerald-600" : "text-amber-600"}`}>
                {s.deltaWeight > 0 ? "+" : ""}
                {s.deltaWeight} kg
                {s.target_weight_kg ? ` · meta ${s.target_weight_kg}` : ""}
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-xs text-muted-foreground">Hoy</p>
            <p className="text-xl font-semibold">
              {Math.round(s.todayKcal ?? 0)}
              {s.goal && (
                <span className="text-sm font-normal text-muted-foreground">
                  {" "}/ {s.goal.kcal}
                </span>
              )}
              <span className="text-sm font-normal text-muted-foreground"> kcal</span>
            </p>
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              <Flame className="size-3.5 text-orange-500" /> Racha {s.streak} días
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tendencia de peso */}
      {s.weightSeries.length >= 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Tendencia de peso</CardTitle>
          </CardHeader>
          <CardContent>
            <ClientWeightChart data={s.weightSeries} />
          </CardContent>
        </Card>
      )}

      {/* Adherencia (últimos 14 días) */}
      {s.adherence && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Target className="size-4 text-primary" /> Adherencia (14 días)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
              <span>
                <strong>{s.adherence.avgKcal}</strong>
                {s.goal && (
                  <span className="text-muted-foreground"> / {s.goal.kcal}</span>
                )}{" "}
                kcal prom.
              </span>
              <span className="text-muted-foreground">
                {s.adherence.daysLogged}/{s.adherence.windowDays} días registrados
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Prom. P {s.adherence.avgProtein} · C {s.adherence.avgCarbs} · G{" "}
              {s.adherence.avgFat} g
              {s.goal && (
                <>
                  {" "}
                  · meta P {s.goal.protein_g}/C {s.goal.carbs_g}/G {s.goal.fat_g}
                </>
              )}
            </p>
            <ClientKcalChart data={s.adherence.series} goal={s.goal?.kcal ?? null} />
          </CardContent>
        </Card>
      )}

      {/* Fotos de progreso del cliente */}
      {s.photos.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Camera className="size-4 text-primary" /> Fotos de progreso
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-2">
              {s.photos.map((p, i) => (
                <div key={i} className="relative overflow-hidden rounded-lg border">
                  {p.url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.url} alt="Progreso" className="aspect-square w-full object-cover" />
                  ) : (
                    <div className="flex aspect-square items-center justify-center bg-muted text-[10px] text-muted-foreground">
                      —
                    </div>
                  )}
                  <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent px-1 py-0.5 text-[10px] text-white">
                    {new Date(p.taken_on + "T00:00:00").toLocaleDateString("es", {
                      day: "numeric",
                      month: "short",
                    })}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Meta vigente */}
      {s.goal && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Meta vigente</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">
              <strong>{s.goal.kcal} kcal</strong> · P {s.goal.protein_g} · C{" "}
              {s.goal.carbs_g} · G {s.goal.fat_g} g
            </p>
          </CardContent>
        </Card>
      )}

      {/* Fijar meta */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ajustar metas</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-3 text-sm text-muted-foreground">
            Define las metas de tu cliente. Reemplazan a su estimado y quedan
            como su meta vigente.
          </p>
          <SetGoalForm clientId={clientId} current={s.goal} />
        </CardContent>
      </Card>

      {/* Mensajes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Mensajes</CardTitle>
        </CardHeader>
        <CardContent>
          <NotesThread notes={notes} variant="coach" clientId={clientId} />
        </CardContent>
      </Card>
    </div>
  );
}
