import type { Metadata } from "next";
import Link from "next/link";
import {
  CalendarRange,
  Dumbbell,
  LogOut,
  ShoppingCart,
  Sparkles,
  UtensilsCrossed,
} from "lucide-react";
import {
  getBodyMetrics,
  getMacrosRange,
  getTodayMacros,
  requireOnboarded,
} from "@/lib/dal";
import { signOut } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DayProgress } from "./day-progress";
import { TrendChart, type TrendPoint } from "./trend-chart";
import { WeightMini, type WeightPoint } from "./weight-mini";

export const metadata: Metadata = { title: "Inicio · Vital360" };

/** Construye una serie continua de los últimos `days` días (0 donde no hay registro). */
function buildTrend(
  consumedByDate: Map<string, number>,
  days: number
): TrendPoint[] {
  const out: TrendPoint[] = [];
  const d = new Date();
  d.setDate(d.getDate() - (days - 1));
  for (let i = 0; i < days; i++) {
    const iso = d.toISOString().slice(0, 10);
    out.push({ date: iso, kcal: consumedByDate.get(iso) ?? 0 });
    d.setDate(d.getDate() + 1);
  }
  return out;
}

export default async function DashboardPage() {
  const { profile, goal } = await requireOnboarded();
  const [todayMacros, range, metrics] = await Promise.all([
    getTodayMacros(),
    getMacrosRange(30),
    getBodyMetrics(60),
  ]);

  const firstName = profile.full_name?.split(" ")[0] ?? "Hola";

  const consumed = {
    kcal: todayMacros?.kcal ?? 0,
    protein_g: todayMacros?.protein_g ?? 0,
    carbs_g: todayMacros?.carbs_g ?? 0,
    fat_g: todayMacros?.fat_g ?? 0,
  };
  const goalMacros = {
    kcal: goal.kcal_target,
    protein_g: goal.protein_g,
    carbs_g: goal.carbs_g,
    fat_g: goal.fat_g,
  };

  const byDate = new Map(range.map((r) => [r.log_date, r.kcal]));
  const trend = buildTrend(byDate, 30);

  const weightSeries: WeightPoint[] = metrics
    .filter((m) => m.weight_kg != null)
    .map((m) => ({
      date: m.measured_at.slice(0, 10),
      weight: m.weight_kg as number,
    }));

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

      {/* Anillos del día */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Hoy</CardTitle>
        </CardHeader>
        <CardContent>
          <DayProgress consumed={consumed} goal={goalMacros} />
        </CardContent>
      </Card>

      {/* Tu plan IA */}
      <Button asChild size="lg" className="h-12 w-full">
        <Link href="/mi-plan">
          <Sparkles /> Ver tu plan
        </Link>
      </Button>

      {/* Accesos rápidos */}
      <div className="grid grid-cols-2 gap-3">
        <Button asChild size="lg" className="h-12">
          <Link href="/log">
            <UtensilsCrossed /> Registrar comida
          </Link>
        </Button>
        <Button asChild size="lg" variant="outline" className="h-12">
          <Link href="/entrenos">
            <Dumbbell /> Registrar entreno
          </Link>
        </Button>
        <Button asChild size="lg" variant="outline" className="h-12">
          <Link href="/plan">
            <CalendarRange /> Plan semanal
          </Link>
        </Button>
        <Button asChild size="lg" variant="outline" className="h-12">
          <Link href="/mercado">
            <ShoppingCart /> Lista de mercado
          </Link>
        </Button>
      </div>

      {/* Tendencia */}
      <Card>
        <CardContent className="pt-6">
          <TrendChart data={trend} goalKcal={goal.kcal_target} />
        </CardContent>
      </Card>

      {/* Peso */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Peso</CardTitle>
        </CardHeader>
        <CardContent>
          <WeightMini data={weightSeries} />
        </CardContent>
      </Card>
    </div>
  );
}
