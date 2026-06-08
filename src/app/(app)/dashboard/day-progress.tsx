"use client";

import {
  PolarAngleAxis,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
} from "recharts";
import type { Macros } from "@/lib/types";

const MACRO_COLORS = {
  protein: "#6366f1",
  carbs: "#f59e0b",
  fat: "#ec4899",
};

export function DayProgress({
  consumed,
  goal,
}: {
  consumed: Macros;
  goal: Macros;
}) {
  const kcalPct =
    goal.kcal > 0 ? Math.min(100, (consumed.kcal / goal.kcal) * 100) : 0;
  const over = consumed.kcal > goal.kcal;
  const remaining = Math.round(goal.kcal - consumed.kcal);
  const ringColor = over ? "#ef4444" : "#10b981";

  return (
    <div className="space-y-4">
      {/* Anillo de calorías */}
      <div className="relative mx-auto h-44 w-44">
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart
            innerRadius="74%"
            outerRadius="100%"
            data={[{ value: kcalPct }]}
            startAngle={90}
            endAngle={-270}
          >
            <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
            <RadialBar
              dataKey="value"
              cornerRadius={30}
              fill={ringColor}
              background={{ fill: "var(--muted)" }}
            />
          </RadialBarChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-3xl font-semibold tabular-nums">
            {Math.round(consumed.kcal)}
          </span>
          <span className="text-xs text-muted-foreground">
            / {Math.round(goal.kcal)} kcal
          </span>
          <span
            className={`mt-1 text-xs font-medium ${
              over ? "text-red-500" : "text-emerald-600"
            }`}
          >
            {over ? `+${Math.abs(remaining)} kcal` : `${remaining} kcal`}
          </span>
        </div>
      </div>

      {/* Barras de macros */}
      <div className="space-y-2.5">
        <MacroBar
          label="Proteína"
          consumed={consumed.protein_g}
          goal={goal.protein_g}
          color={MACRO_COLORS.protein}
        />
        <MacroBar
          label="Carbos"
          consumed={consumed.carbs_g}
          goal={goal.carbs_g}
          color={MACRO_COLORS.carbs}
        />
        <MacroBar
          label="Grasa"
          consumed={consumed.fat_g}
          goal={goal.fat_g}
          color={MACRO_COLORS.fat}
        />
      </div>
    </div>
  );
}

function MacroBar({
  label,
  consumed,
  goal,
  color,
}: {
  label: string;
  consumed: number;
  goal: number;
  color: string;
}) {
  const pct = goal > 0 ? Math.min(100, (consumed / goal) * 100) : 0;
  const over = consumed > goal && goal > 0;
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="tabular-nums text-muted-foreground">
          {Math.round(consumed)} / {Math.round(goal)} g
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${pct}%`,
            backgroundColor: over ? "#ef4444" : color,
          }}
        />
      </div>
    </div>
  );
}
