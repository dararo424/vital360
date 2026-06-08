"use client";

import Link from "next/link";
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  YAxis,
} from "recharts";

export type WeightPoint = { date: string; weight: number };

export function WeightMini({ data }: { data: WeightPoint[] }) {
  if (data.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Aún no registras tu peso.{" "}
        <Link href="/progreso" className="font-medium text-primary hover:underline">
          Regístralo
        </Link>
        .
      </p>
    );
  }

  const current = data[data.length - 1].weight;
  const first = data[0].weight;
  const delta = Math.round((current - first) * 10) / 10;

  return (
    <div className="flex items-center gap-4">
      <div className="shrink-0">
        <div className="text-2xl font-semibold tabular-nums">
          {current}
          <span className="ml-1 text-sm font-normal text-muted-foreground">kg</span>
        </div>
        {data.length > 1 && (
          <div
            className={`text-xs ${
              delta > 0
                ? "text-amber-600"
                : delta < 0
                  ? "text-emerald-600"
                  : "text-muted-foreground"
            }`}
          >
            {delta > 0 ? "+" : ""}
            {delta} kg en el periodo
          </div>
        )}
      </div>
      <div className="h-12 flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
            <YAxis hide domain={["dataMin - 1", "dataMax + 1"]} />
            <Tooltip
              contentStyle={{
                borderRadius: 8,
                border: "1px solid var(--border)",
                background: "var(--background)",
                fontSize: 12,
              }}
              formatter={(v) => [`${Number(v)} kg`, "Peso"]}
              labelFormatter={() => ""}
            />
            <Line
              type="monotone"
              dataKey="weight"
              stroke="#10b981"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
