import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getBodyMetrics, getProfile, requireOnboarded } from "@/lib/dal";
import { SettingsForm } from "./settings-form";

export const metadata: Metadata = { title: "Ajustes · Vital360" };
export const maxDuration = 60;

/* eslint-disable @typescript-eslint/no-explicit-any */
export default async function AjustesPage() {
  const { goal } = await requireOnboarded();
  const profile = (await getProfile()) as any;
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
    </div>
  );
}
