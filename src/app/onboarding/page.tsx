import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getActiveGoal, getProfile, requireUser } from "@/lib/dal";
import { SmartOnboarding } from "./smart-onboarding";

export const metadata: Metadata = { title: "Bienvenido · Vital360" };

// La generación del plan con IA puede tardar ~30s.
export const maxDuration = 60;

export default async function OnboardingPage() {
  const user = await requireUser();
  const [profile, goal] = await Promise.all([getProfile(), getActiveGoal()]);

  // Si ya completó el onboarding y tiene meta vigente, no lo repitas.
  if (profile?.height_cm && goal) {
    redirect("/dashboard");
  }

  const defaultName =
    profile?.full_name ??
    (user.user_metadata?.full_name as string | undefined) ??
    "";

  return (
    <main className="bg-app-gradient min-h-dvh px-4 py-10">
      <SmartOnboarding defaultName={defaultName} />
    </main>
  );
}
