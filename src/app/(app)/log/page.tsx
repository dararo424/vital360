import type { Metadata } from "next";
import { Camera, Pencil } from "lucide-react";
import {
  getActiveGoal,
  getRecentFoods,
  getTodayMacros,
  requireOnboarded,
} from "@/lib/dal";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ManualLog } from "./manual-log";
import { PhotoLog } from "./photo-log";

export const metadata: Metadata = { title: "Registrar · Vital360" };

export default async function LogPage() {
  await requireOnboarded();
  const [goal, today, recent] = await Promise.all([
    getActiveGoal(),
    getTodayMacros(),
    getRecentFoods(8),
  ]);

  const remaining = goal
    ? {
        kcal: goal.kcal_target - (today?.kcal ?? 0),
        protein_g: goal.protein_g - (today?.protein_g ?? 0),
        carbs_g: goal.carbs_g - (today?.carbs_g ?? 0),
        fat_g: goal.fat_g - (today?.fat_g ?? 0),
      }
    : null;

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">
          Registrar comida
        </h1>
        {remaining && (
          <p className="text-sm text-muted-foreground">
            Te quedan{" "}
            <span className="font-medium text-foreground">
              {Math.round(remaining.kcal)} kcal
            </span>{" "}
            hoy · P {Math.round(remaining.protein_g)} · C{" "}
            {Math.round(remaining.carbs_g)} · G {Math.round(remaining.fat_g)} g
          </p>
        )}
      </header>

      <Tabs defaultValue="foto">
        <TabsList className="w-full">
          <TabsTrigger value="foto" className="flex-1">
            <Camera /> Foto
          </TabsTrigger>
          <TabsTrigger value="manual" className="flex-1">
            <Pencil /> Manual
          </TabsTrigger>
        </TabsList>
        <TabsContent value="foto" className="mt-4">
          <PhotoLog />
        </TabsContent>
        <TabsContent value="manual" className="mt-4">
          <ManualLog recent={recent} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
