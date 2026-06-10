"use client";

import { useState, useTransition } from "react";
import { Droplet, Minus, Plus } from "lucide-react";
import { addWater } from "@/app/actions/water";
import { Button } from "@/components/ui/button";

const GOAL = 2000; // ml
const GLASS = 250;

export function WaterCard({ initial }: { initial: number }) {
  const [ml, setMl] = useState(initial);
  const [, start] = useTransition();

  function change(delta: number) {
    setMl((m) => Math.max(0, m + delta)); // optimista
    start(async () => {
      const res = await addWater(delta);
      if (res.ok) setMl(res.ml);
    });
  }

  const pct = Math.min(100, Math.round((ml / GOAL) * 100));
  const glasses = Math.round(ml / GLASS);
  const goalGlasses = GOAL / GLASS;

  return (
    <div className="space-y-3">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-2xl font-semibold tabular-nums">
            {(ml / 1000).toFixed(2).replace(/\.?0+$/, "")} L
            <span className="ml-1 text-sm font-normal text-muted-foreground">
              / {GOAL / 1000} L
            </span>
          </p>
          <p className="text-xs text-muted-foreground">
            {glasses} de {goalGlasses} vasos
          </p>
        </div>
        <div className="flex gap-1.5">
          <Button type="button" variant="outline" size="icon" aria-label="Quitar vaso" onClick={() => change(-GLASS)}>
            <Minus />
          </Button>
          <Button type="button" size="icon" aria-label="Agregar vaso" onClick={() => change(GLASS)}>
            <Plus />
          </Button>
        </div>
      </div>

      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-sky-500 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="flex gap-2">
        <Button type="button" variant="secondary" size="sm" className="h-8 flex-1" onClick={() => change(GLASS)}>
          <Droplet /> Vaso (250 ml)
        </Button>
        <Button type="button" variant="secondary" size="sm" className="h-8 flex-1" onClick={() => change(500)}>
          <Droplet /> Botella (500 ml)
        </Button>
      </div>
    </div>
  );
}
