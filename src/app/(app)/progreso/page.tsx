import type { Metadata } from "next";
import { LineChart } from "lucide-react";
import { getBodyMetrics, requireOnboarded } from "@/lib/dal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProgressForm } from "./progress-form";
import { MetricsChart } from "./metrics-chart";
import { DeleteMetricButton } from "./metric-actions";

export const metadata: Metadata = { title: "Progreso · Vital360" };

export default async function ProgresoPage() {
  await requireOnboarded();
  const metrics = await getBodyMetrics(180); // ascendente por fecha
  const history = [...metrics].reverse();

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-semibold tracking-tight">Progreso</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Registrar peso y medidas</CardTitle>
        </CardHeader>
        <CardContent>
          <ProgressForm metrics={metrics} />
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
