"use client";

import { useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";

export type TrendPoint = { date: string; kcal: number };

function fmtDay(iso: string): string {
  // iso = YYYY-MM-DD → "7 jun"
  const [, m, d] = iso.split("-");
  const months = [
    "ene", "feb", "mar", "abr", "may", "jun",
    "jul", "ago", "sep", "oct", "nov", "dic",
  ];
  return `${Number(d)} ${months[Number(m) - 1]}`;
}

export function TrendChart({
  data,
  goalKcal,
}: {
  data: TrendPoint[];
  goalKcal: number;
}) {
  const [range, setRange] = useState<7 | 30>(7);
  const sliced = data.slice(-range);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium">Calorías vs meta</h2>
        <div className="flex gap-1">
          {([7, 30] as const).map((r) => (
            <Button
              key={r}
              type="button"
              variant={range === r ? "default" : "outline"}
              size="xs"
              onClick={() => setRange(r)}
            >
              {r}d
            </Button>
          ))}
        </div>
      </div>

      {sliced.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">
          Aún no hay registros. Registra una comida para ver tu tendencia.
        </p>
      ) : (
        <ResponsiveContainer width="100%" height={180}>
          <AreaChart data={sliced} margin={{ top: 5, right: 5, left: -18, bottom: 0 }}>
            <defs>
              <linearGradient id="kcalFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis
              dataKey="date"
              tickFormatter={fmtDay}
              tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
              tickLine={false}
              axisLine={false}
              minTickGap={20}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
              tickLine={false}
              axisLine={false}
              width={42}
            />
            <Tooltip
              contentStyle={{
                borderRadius: 8,
                border: "1px solid var(--border)",
                background: "var(--background)",
                fontSize: 12,
              }}
              labelFormatter={(l) => fmtDay(String(l))}
              formatter={(v) => [`${Math.round(Number(v))} kcal`, "Consumido"]}
            />
            <ReferenceLine
              y={goalKcal}
              stroke="#6b7280"
              strokeDasharray="4 4"
              label={{
                value: `meta ${goalKcal}`,
                position: "insideTopRight",
                fontSize: 10,
                fill: "var(--muted-foreground)",
              }}
            />
            <Area
              type="monotone"
              dataKey="kcal"
              stroke="#10b981"
              strokeWidth={2}
              fill="url(#kcalFill)"
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
