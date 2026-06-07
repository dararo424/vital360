import { redirect } from "next/navigation";
import { getActiveGoal, getProfile, getUser } from "@/lib/dal";

export default async function Home() {
  const user = await getUser();
  if (!user) redirect("/login");

  const [profile, goal] = await Promise.all([getProfile(), getActiveGoal()]);
  if (!profile?.height_cm || !goal) redirect("/onboarding");

  redirect("/dashboard");
}
