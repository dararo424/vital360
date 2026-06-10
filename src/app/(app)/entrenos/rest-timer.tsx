"use client";

import { useEffect, useRef, useState } from "react";
import { Timer, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const PRESETS = [60, 90, 120, 180];

export function RestTimer() {
  const [remaining, setRemaining] = useState(0);
  const ref = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(
    () => () => {
      if (ref.current) clearInterval(ref.current);
    },
    []
  );

  // Al llegar a 0 con un timer activo: detener y vibrar.
  useEffect(() => {
    if (remaining === 0 && ref.current) {
      clearInterval(ref.current);
      ref.current = null;
      try {
        navigator.vibrate?.([200, 100, 200]);
      } catch {
        /* sin vibración */
      }
    }
  }, [remaining]);

  function start(sec: number) {
    if (ref.current) clearInterval(ref.current);
    setRemaining(sec);
    ref.current = setInterval(() => {
      setRemaining((r) => (r > 1 ? r - 1 : 0));
    }, 1000);
  }

  function stop() {
    if (ref.current) clearInterval(ref.current);
    ref.current = null;
    setRemaining(0);
  }

  const mm = Math.floor(remaining / 60);
  const ss = remaining % 60;

  return (
    <div className="rounded-xl border p-3">
      <div className="mb-2 flex items-center justify-between">
        <p className="flex items-center gap-2 text-sm font-medium">
          <Timer className="size-4 text-primary" /> Descanso
        </p>
        {remaining > 0 && (
          <span className="font-mono text-lg font-semibold tabular-nums">
            {mm}:{String(ss).padStart(2, "0")}
          </span>
        )}
      </div>
      {remaining > 0 ? (
        <Button type="button" variant="outline" size="sm" className="h-8 w-full" onClick={stop}>
          <X /> Detener
        </Button>
      ) : (
        <div className="flex gap-1.5">
          {PRESETS.map((s) => (
            <Button
              key={s}
              type="button"
              variant="secondary"
              size="sm"
              className="h-8 flex-1"
              onClick={() => start(s)}
            >
              {s < 60 ? `${s}s` : `${s / 60}m`}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
