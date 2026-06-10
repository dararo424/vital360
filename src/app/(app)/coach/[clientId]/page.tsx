import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Flame } from "lucide-react";
import { requireOnboarded } from "@/lib/dal";
import { getClientSummary } from "@/app/actions/coach";
import { OBJECTIVE_LABELS, type Objective } from "@/lib/nutrition-plan";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SetGoalForm } from "./set-goal-form";

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
    </div>
  );
}
