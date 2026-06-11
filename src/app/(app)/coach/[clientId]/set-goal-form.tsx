"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, X } from "lucide-react";
import { setClientGoal } from "@/app/actions/coach";
import type { Macros } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { DecimalInput } from "@/components/ui/decimal-input";
import { Label } from "@/components/ui/label";

export function SetGoalForm({
  clientId,
  current,
}: {
  clientId: string;
  current: Macros | null;
}) {
  const router = useRouter();
  const [g, setG] = useState({
    kcal_target: current ? String(current.kcal) : "",
    protein_g: current ? String(current.protein_g) : "",
    carbs_g: current ? String(current.carbs_g) : "",
    fat_g: current ? String(current.fat_g) : "",
  });
  const set = (k: keyof typeof g, v: string) => setG((p) => ({ ...p, [k]: v }));
  const [busy, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  function save() {
    setMsg(null);
    start(async () => {
      const res = await setClientGoal(clientId, g);
      if (res.ok) {
        setMsg({ ok: true, text: "Meta fijada ✓ (modo adaptable desactivado)" });
        router.refresh();
      } else setMsg({ ok: false, text: res.error ?? "Error" });
    });
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-4 gap-2">
        {(
          [
            ["kcal_target", "Kcal"],
            ["protein_g", "Prot."],
            ["carbs_g", "Carbs"],
            ["fat_g", "Grasa"],
          ] as const
        ).map(([key, label]) => (
          <div key={key} className="space-y-1">
            <Label className="text-[11px] text-muted-foreground">{label}</Label>
            <DecimalInput
              value={g[key]}
              onChange={(v) => set(key, v)}
              className="px-1.5 text-center"
            />
          </div>
        ))}
      </div>
      {msg && (
        <p className={`flex items-center gap-1.5 text-sm ${msg.ok ? "text-emerald-600" : "text-destructive"}`}>
          {msg.ok ? <Check className="size-4" /> : <X className="size-4" />} {msg.text}
        </p>
      )}
      <Button type="button" size="lg" className="h-11 w-full" onClick={save} disabled={busy}>
        {busy ? "Guardando…" : "Fijar esta meta al cliente"}
      </Button>
    </div>
  );
}
