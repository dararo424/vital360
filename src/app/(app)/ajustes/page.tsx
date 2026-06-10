import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getBodyMetrics, getProfile, requireOnboarded } from "@/lib/dal";
import { getCoachStatus } from "@/app/actions/coach";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SettingsForm } from "./settings-form";
import { InstallButton } from "./install-button";
import { NotificationsToggle } from "./notifications-toggle";
import { CoachCard } from "./coach-card";

export const metadata: Metadata = { title: "Ajustes · Vital360" };
export const maxDuration = 60;

/* eslint-disable @typescript-eslint/no-explicit-any */
export default async function AjustesPage() {
  const { goal } = await requireOnboarded();
  const profile = (await getProfile()) as any;
  const coachStatus = await getCoachStatus();
  const metrics = await getBodyMetrics(60);
  const withWeight = [...metrics].reverse().find((m) => m.weight_kg != null);
  const weight = withWeight?.weight_kg ?? null;

  return (
    <div className="space-y-5">
      <Link
        href="/dashboard"
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" /> Inicio
      </Link>
      <h1 className="text-2xl font-semibold tracking-tight">Ajustes</h1>

      <SettingsForm
        profile={{
          full_name: profile?.full_name ?? "",
          sex: profile?.sex ?? "",
          birth_date: profile?.birth_date ?? "",
          height_cm: profile?.height_cm ?? null,
          activity_level: profile?.activity_level ?? "",
          objective: profile?.objective ?? "",
          target_weight_kg: profile?.target_weight_kg ?? null,
          intensity: profile?.intensity ?? "equilibrado",
          adaptive: profile?.adaptive ?? true,
        }}
        goalCurrent={
          goal
            ? {
                kcal_target: goal.kcal_target,
                protein_g: goal.protein_g,
                carbs_g: goal.carbs_g,
                fat_g: goal.fat_g,
              }
            : null
        }
        weight={weight}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tu nutricionista</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-3 text-sm text-muted-foreground">
            Conecta a tu nutricionista para que vea tu progreso y ajuste tus
            metas a distancia.
          </p>
          <CoachCard initial={coachStatus} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Instalar app</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-3 text-sm text-muted-foreground">
            Instala Vital360 en tu teléfono para abrirla como una app, a pantalla
            completa y con acceso directo.
          </p>
          <InstallButton />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recordatorios</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-3 text-sm text-muted-foreground">
            Recibe una notificación si llega la tarde y aún no registraste tus
            comidas, para no perder tu racha.
          </p>
          <NotificationsToggle />
        </CardContent>
      </Card>
    </div>
  );
}
