"use client";

import { useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { BodyMetric } from "@/lib/types";
import { cn } from "@/lib/utils";

type MetricKey = "weight_kg" | "body_fat_pct" | "waist_cm" | "chest_cm" | "arm_cm" | "thigh_cm";

const METRICS: { key: MetricKey; label: string; unit: string }[] = [
  { key: "weight_kg", label: "Peso", unit: "kg" },
  { key: "body_fat_pct", label: "% grasa", unit: "%" },
  { key: "waist_cm", label: "Cintura", unit: "cm" },
  { key: "chest_cm", label: "Pecho", unit: "cm" },
  { key: "arm_cm", label: "Brazo", unit: "cm" },
  { key: "thigh_cm", label: "Muslo", unit: "cm" },
];

function fmtDay(iso: string): string {
  const [, m, d] = iso.slice(0, 10).split("-");
  const months = ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];
  return `${Number(d)} ${months[Number(m) - 1]}`;
}

export function MetricsChart({ metrics }: { metrics: BodyMetric[] }) {
  const [active, setActive] = useState<MetricKey>("weight_kg");
  const meta = METRICS.find((m) => m.key === active)!;

  const data = metrics
    .map((m) => ({ date: m.measured_at.slice(0, 10), value: m[active] }))
    .filter((d) => d.value != null);

  // Solo mostramos métricas que tengan al menos un dato.
  const available = METRICS.filter((m) =>
    metrics.some((x) => x[m.key] != null)
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {available.map((m) => (
          <button
            key={m.key}
            type="button"
            onClick={() => setActive(m.key)}
            className={cn(
              "rounded-full border px-2.5 py-1 text-xs transition-colors",
              active === m.key
                ? "border-primary bg-primary text-primary-foreground"
                : "hover:bg-muted"
            )}
          >
            {m.label}
          </button>
        ))}
      </div>

      {data.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">
          Sin datos de {meta.label.toLowerCase()} todavía.
        </p>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={data} margin={{ top: 5, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="date" tickFormatter={fmtDay} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} minTickGap={24} />
            <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} width={40} domain={["dataMin - 1", "dataMax + 1"]} />
            <Tooltip
              contentStyle={{ borderRadius: 8, border: "1px solid var(--border)", background: "var(--background)", fontSize: 12 }}
              labelFormatter={(l) => fmtDay(String(l))}
              formatter={(v) => [`${Number(v)} ${meta.unit}`, meta.label]}
            />
            <Line type="monotone" dataKey="value" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
