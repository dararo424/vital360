"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

function fmtDay(iso: string): string {
  const [, m, d] = iso.split("-");
  return `${Number(d)}/${Number(m)}`;
}

export function ClientKcalChart({
  data,
  goal,
}: {
  data: { date: string; kcal: number }[];
  goal: number | null;
}) {
  if (data.length < 2) {
    return (
      <p className="py-4 text-center text-sm text-muted-foreground">
        Aún no hay suficientes días registrados.
      </p>
    );
  }
  return (
    <ResponsiveContainer width="100%" height={170}>
      <BarChart data={data} margin={{ top: 5, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis dataKey="date" tickFormatter={fmtDay} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} minTickGap={16} />
        <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} width={40} />
        {goal != null && (
          <ReferenceLine y={goal} stroke="#f59e0b" strokeDasharray="4 4" />
        )}
        <Tooltip
          contentStyle={{ borderRadius: 8, border: "1px solid var(--border)", background: "var(--background)", fontSize: 12 }}
          labelFormatter={(l) => fmtDay(String(l))}
          formatter={(v) => [`${Number(v)} kcal`, "Consumido"]}
        />
        <Bar dataKey="kcal" fill="#10b981" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
