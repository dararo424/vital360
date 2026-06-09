"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

function shift(date: string, days: number): string {
  const d = new Date(date + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}
function localToday(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function DateNav({ date }: { date: string }) {
  const router = useRouter();
  const today = localToday();
  const isToday = date === today;
  const label = new Date(date + "T00:00:00").toLocaleDateString("es", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <div className="flex items-center justify-between rounded-xl border p-1.5">
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Día anterior"
        onClick={() => router.push(`/diario?date=${shift(date, -1)}`)}
      >
        <ChevronLeft />
      </Button>
      <div className="text-center">
        <p className="text-sm font-medium capitalize">{isToday ? "Hoy" : label}</p>
        {!isToday && (
          <button
            type="button"
            onClick={() => router.push(`/diario?date=${today}`)}
            className="text-xs text-primary hover:underline"
          >
            Volver a hoy
          </button>
        )}
      </div>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Día siguiente"
        disabled={isToday}
        onClick={() => router.push(`/diario?date=${shift(date, 1)}`)}
      >
        <ChevronRight />
      </Button>
    </div>
  );
}
