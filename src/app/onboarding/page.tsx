import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getActiveGoal, getProfile, requireUser } from "@/lib/dal";
import { OnboardingWizard } from "./onboarding-wizard";

export const metadata: Metadata = { title: "Bienvenido · Vital360" };

export default async function OnboardingPage() {
  const user = await requireUser();
  const [profile, goal] = await Promise.all([getProfile(), getActiveGoal()]);

  // Si ya completó el onboarding y tiene meta vigente, no lo repitas.
  if (profile?.onboarding_completed && goal) {
    redirect("/dashboard");
  }

  const defaultName =
    profile?.full_name ??
    (user.user_metadata?.full_name as string | undefined) ??
    "";

  return (
    <main className="min-h-dvh bg-muted/30 px-4 py-10">
      <OnboardingWizard defaultName={defaultName} />
    </main>
  );
}
