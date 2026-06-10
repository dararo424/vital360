"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

function fmtDay(iso: string): string {
  const [, m, d] = iso.split("-");
  const months = ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];
  return `${Number(d)} ${months[Number(m) - 1]}`;
}

export function ExerciseChart({
  data,
}: {
  data: { date: string; maxWeight: number | null }[];
}) {
  const points = data.filter((d) => d.maxWeight != null) as { date: string; maxWeight: number }[];
  if (points.length < 2) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        Registra este ejercicio en más entrenos para ver tu progresión.
      </p>
    );
  }
  return (
    <ResponsiveContainer width="100%" height={190}>
      <LineChart data={points} margin={{ top: 5, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis dataKey="date" tickFormatter={fmtDay} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} minTickGap={24} />
        <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} width={40} domain={["dataMin - 2", "dataMax + 2"]} />
        <Tooltip
          contentStyle={{ borderRadius: 8, border: "1px solid var(--border)", background: "var(--background)", fontSize: 12 }}
          labelFormatter={(l) => fmtDay(String(l))}
          formatter={(v) => [`${Number(v)} kg`, "Mejor peso"]}
        />
        <Line type="monotone" dataKey="maxWeight" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}
