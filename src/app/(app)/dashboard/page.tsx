import type { Metadata } from "next";
import { LogOut } from "lucide-react";
import { requireOnboarded } from "@/lib/dal";
import { signOut } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = { title: "Inicio · Vital360" };

export default async function DashboardPage() {
  const { profile, goal } = await requireOnboarded();
  const firstName = profile.full_name?.split(" ")[0] ?? "Hola";

  const macros = [
    { label: "Calorías", value: goal.kcal_target, unit: "kcal" },
    { label: "Proteína", value: goal.protein_g, unit: "g" },
    { label: "Carbos", value: goal.carbs_g, unit: "g" },
    { label: "Grasa", value: goal.fat_g, unit: "g" },
  ];

  return (
    <div className="space-y-5">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Hola,</p>
          <h1 className="text-2xl font-semibold tracking-tight">{firstName}</h1>
        </div>
        <form action={signOut}>
          <Button variant="ghost" size="icon" type="submit" aria-label="Cerrar sesión">
            <LogOut className="size-5" />
          </Button>
        </form>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tu meta de hoy</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-3">
            {macros.map((m) => (
              <div key={m.label} className="rounded-lg border bg-muted/30 p-3">
                <dt className="text-xs text-muted-foreground">{m.label}</dt>
                <dd className="text-xl font-semibold">
                  {m.value}
                  <span className="ml-1 text-sm font-normal text-muted-foreground">
                    {m.unit}
                  </span>
                </dd>
              </div>
            ))}
          </dl>
          <p className="mt-3 text-xs text-muted-foreground">
            Metas de tu nutricionista, vigentes desde{" "}
            {new Date(goal.effective_from).toLocaleDateString("es")}.
          </p>
        </CardContent>
      </Card>

      <p className="px-1 text-sm text-muted-foreground">
        El conteo del día y la tendencia llegan en el siguiente módulo. Por ahora
        ya tienes tu plan cargado y tu sesión lista. 🌱
      </p>
    </div>
  );
}
