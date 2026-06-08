import type { Metadata } from "next";
import {
  getActiveGoal,
  getPlanWeek,
  getRecipes,
  mondayOf,
  requireOnboarded,
  weekDays,
} from "@/lib/dal";
import { Planner } from "./planner";

export const metadata: Metadata = { title: "Plan semanal · Vital360" };

export default async function PlanPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  await requireOnboarded();
  const { week } = await searchParams;
  const weekStart = mondayOf(week);

  const [{ entries }, goal, recipes] = await Promise.all([
    getPlanWeek(weekStart),
    getActiveGoal(),
    getRecipes(),
  ]);

  return (
    <Planner
      weekStart={weekStart}
      days={weekDays(weekStart)}
      goalKcal={goal?.kcal_target ?? 0}
      entries={entries}
      recipes={recipes.map((r) => ({
        id: r.id,
        title: r.title,
        kcal: r.perServing.kcal,
      }))}
    />
  );
}
