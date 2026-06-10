import type { Metadata } from "next";
import { Camera, LineChart, TrendingUp } from "lucide-react";
import {
  detectStagnation,
  getBodyMetrics,
  getProgressPhotos,
  requireOnboarded,
} from "@/lib/dal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProgressForm } from "./progress-form";
import { MetricsChart } from "./metrics-chart";
import { DeleteMetricButton } from "./metric-actions";
import { ProgressPhotos } from "./progress-photos";

export const metadata: Metadata = { title: "Progreso · Vital360" };

export default async function ProgresoPage() {
  const { user, profile } = await requireOnboarded();
  const [metrics, photos] = await Promise.all([
    getBodyMetrics(180), // ascendente por fecha
    getProgressPhotos(),
  ]);
  const history = [...metrics].reverse();
  const p = profile as {
    adaptive?: boolean | null;
    objective?: string | null;
    target_weight_kg?: number | null;
  };
  const adaptive = p.adaptive ?? false;
  const stale = detectStagnation(metrics, p.objective ?? null, p.target_weight_kg ?? null);

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-semibold tracking-tight">Progreso</h1>

      {stale && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
          <p className="flex items-center gap-2 text-sm font-medium">
            <TrendingUp className="size-4 text-amber-600" /> Tu peso se estabilizó
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Llevas ~3 semanas casi sin cambios (Δ {stale.deltaKg > 0 ? "+" : ""}
            {stale.deltaKg} kg).{" "}
            {stale.direction === "loss" ? (
              <>
                Estancarse es normal. Sé constante con el registro, revisa porciones
                y suma pasos/actividad. Si continúa, valida con tu nutricionista un
                ajuste pequeño (~100–200 kcal). Sin déficits agresivos.
              </>
            ) : (
              <>
                Para seguir ganando músculo quizá necesites un poco más de energía y
                proteína. Valida el ajuste con tu nutricionista.
              </>
            )}
          </p>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Registrar peso y medidas</CardTitle>
        </CardHeader>
        <CardContent>
          <ProgressForm metrics={metrics} />
          {adaptive && (
            <p className="mt-3 text-xs text-muted-foreground">
              🔄 Modo adaptable activo: al guardar tu peso, tu meta de calorías se
              recalcula sola.
            </p>
          )}
        </CardContent>
      </Card>

      {metrics.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <LineChart className="size-4" /> Tendencia
            </CardTitle>
          </CardHeader>
          <CardContent>
            <MetricsChart metrics={metrics} />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Camera className="size-4" /> Fotos de progreso
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ProgressPhotos userId={user.id} photos={photos} />
        </CardContent>
      </Card>

      {history.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Historial</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="divide-y text-sm">
              {history.map((m) => (
                <li key={m.id} className="flex items-center justify-between gap-2 py-2">
                  <div>
                    <p className="font-medium">
                      {new Date(m.measured_at).toLocaleDateString("es", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {[
                        m.weight_kg != null && `${m.weight_kg} kg`,
                        m.body_fat_pct != null && `${m.body_fat_pct}% grasa`,
                        m.waist_cm != null && `cintura ${m.waist_cm}`,
                        m.chest_cm != null && `pecho ${m.chest_cm}`,
                        m.arm_cm != null && `brazo ${m.arm_cm}`,
                        m.thigh_cm != null && `muslo ${m.thigh_cm}`,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                  <DeleteMetricButton id={m.id} />
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
