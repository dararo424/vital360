import { redirect } from "next/navigation";
import { getActiveGoal, getProfile, getUser } from "@/lib/dal";

export default async function Home() {
  const user = await getUser();
  if (!user) redirect("/login");

  const [profile, goal] = await Promise.all([getProfile(), getActiveGoal()]);
  if (!profile?.onboarding_completed || !goal) redirect("/onboarding");

  redirect("/dashboard");
}
