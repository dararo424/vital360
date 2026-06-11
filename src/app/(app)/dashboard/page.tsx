import type { Metadata } from "next";
import Link from "next/link";
import {
  CalendarRange,
  Droplet,
  Dumbbell,
  Flame,
  LogOut,
  Settings,
  ShoppingCart,
  Sparkles,
  Users,
  UtensilsCrossed,
} from "lucide-react";
import {
  getBodyMetrics,
  getLoggingStreak,
  getMacrosRange,
  getTodayMacros,
  getWaterToday,
  requireOnboarded,
} from "@/lib/dal";
import { signOut } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DayProgress } from "./day-progress";
import { TrendChart, type TrendPoint } from "./trend-chart";
import { WeightMini, type WeightPoint } from "./weight-mini";
import { WaterCard } from "./water-card";
import { NutritionCoach } from "./nutrition-coach";
import { AntiCraving } from "./anti-craving";

export const metadata: Metadata = { title: "Inicio · Vital360" };
export const maxDuration = 60; // análisis nutricional con IA

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
  const [todayMacros, range, metrics, streak, water] = await Promise.all([
    getTodayMacros(),
    getMacrosRange(30),
    getBodyMetrics(60),
    getLoggingStreak(),
    getWaterToday(),
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
        <div className="flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-2xl bg-primary/12 text-lg font-semibold text-primary">
            {firstName.charAt(0).toUpperCase()}
          </span>
          <div>
            <p className="text-sm text-muted-foreground">Hola,</p>
            <h1 className="text-2xl font-semibold leading-tight tracking-tight">
              {firstName}
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button asChild variant="ghost" size="icon" aria-label="Ajustes">
            <Link href="/ajustes">
              <Settings className="size-5" />
            </Link>
          </Button>
          <form action={signOut}>
            <Button variant="ghost" size="icon" type="submit" aria-label="Cerrar sesión">
              <LogOut className="size-5" />
            </Button>
          </form>
        </div>
      </header>

      {/* Racha */}
      <Card>
        <CardContent className="flex items-center justify-between py-3">
          <div className="flex items-center gap-2.5">
            <Flame
              className={`size-6 ${streak.current > 0 ? "text-orange-500" : "text-muted-foreground"}`}
            />
            <div>
              <p className="text-sm font-semibold leading-tight">
                {streak.current > 0
                  ? `${streak.current} día${streak.current === 1 ? "" : "s"} seguidos`
                  : "Empieza tu racha"}
              </p>
              <p className="text-xs text-muted-foreground">
                {streak.loggedToday
                  ? "¡Registrado hoy! 🎉"
                  : "Registra algo hoy para sumar 🔥"}
              </p>
            </div>
          </div>
          <div className="flex gap-1">
            {streak.last7.map((d) => (
              <span
                key={d.date}
                title={d.date}
                className={`size-2.5 rounded-full ${d.logged ? "bg-primary" : "bg-muted"}`}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Anillos del día */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Hoy</CardTitle>
          <Link
            href="/diario"
            className="text-sm font-medium text-primary hover:underline"
          >
            Ver diario →
          </Link>
        </CardHeader>
        <CardContent>
          <DayProgress consumed={consumed} goal={goalMacros} />
        </CardContent>
      </Card>

      {/* Agua */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Droplet className="size-4 text-sky-500" /> Agua
          </CardTitle>
        </CardHeader>
        <CardContent>
          <WaterCard initial={water} />
        </CardContent>
      </Card>

      {/* Coach nutricional IA */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="size-4 text-primary" /> Coach nutricional
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <AntiCraving />
          <NutritionCoach />
        </CardContent>
      </Card>

      {/* Tu plan IA */}
      <Button
        asChild
        size="lg"
        className="h-12 w-full bg-gradient-to-br from-primary to-[oklch(0.72_0.17_140)] text-primary-foreground shadow-md shadow-primary/20"
      >
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
        <Button asChild size="lg" variant="outline" className="col-span-2 h-12">
          <Link href="/familia">
            <Users /> Familia
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
