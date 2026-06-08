"use client";

import { useState, useTransition } from "react";
import { Check, X } from "lucide-react";
import { saveBodyMetric } from "@/app/actions/progress";
import type { BodyMetric } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Fields = {
  weight_kg: string;
  body_fat_pct: string;
  waist_cm: string;
  chest_cm: string;
  arm_cm: string;
  thigh_cm: string;
  note: string;
};

const EMPTY: Fields = {
  weight_kg: "",
  body_fat_pct: "",
  waist_cm: "",
  chest_cm: "",
  arm_cm: "",
  thigh_cm: "",
  note: "",
};

function localToday(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function fromMetric(m: BodyMetric | undefined): Fields {
  if (!m) return { ...EMPTY };
  const s = (n: number | null) => (n == null ? "" : String(n));
  return {
    weight_kg: s(m.weight_kg),
    body_fat_pct: s(m.body_fat_pct),
    waist_cm: s(m.waist_cm),
    chest_cm: s(m.chest_cm),
    arm_cm: s(m.arm_cm),
    thigh_cm: s(m.thigh_cm),
    note: m.note ?? "",
  };
}

export function ProgressForm({ metrics }: { metrics: BodyMetric[] }) {
  const byDate = new Map(metrics.map((m) => [m.measured_at.slice(0, 10), m]));
  const [date, setDate] = useState(localToday);
  const [fields, setFields] = useState<Fields>(() => fromMetric(byDate.get(localToday())));
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  function changeDate(d: string) {
    setDate(d);
    setFields(fromMetric(byDate.get(d)));
    setMsg(null);
  }
  const set = (k: keyof Fields) => (v: string) =>
    setFields((p) => ({ ...p, [k]: v }));

  function submit() {
    setMsg(null);
    start(async () => {
      const res = await saveBodyMetric({ measured_at: date, ...fields });
      if (res && res.ok) setMsg({ ok: true, text: "Guardado ✓" });
      else if (res) setMsg({ ok: false, text: res.error });
    });
  }

  const existing = byDate.has(date);

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="date">Fecha</Label>
        <Input id="date" type="date" value={date} max={localToday()} onChange={(e) => changeDate(e.target.value)} />
        {existing && (
          <p className="text-xs text-muted-foreground">
            Ya tienes un registro este día; al guardar lo actualizas.
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <NumField label="Peso (kg)" value={fields.weight_kg} onChange={set("weight_kg")} />
        <NumField label="% grasa" value={fields.body_fat_pct} onChange={set("body_fat_pct")} />
        <NumField label="Cintura (cm)" value={fields.waist_cm} onChange={set("waist_cm")} />
        <NumField label="Pecho (cm)" value={fields.chest_cm} onChange={set("chest_cm")} />
        <NumField label="Brazo (cm)" value={fields.arm_cm} onChange={set("arm_cm")} />
        <NumField label="Muslo (cm)" value={fields.thigh_cm} onChange={set("thigh_cm")} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="note">Nota (opcional)</Label>
        <Input id="note" value={fields.note} onChange={(e) => set("note")(e.target.value)} placeholder="Cómo te sentiste, contexto…" />
      </div>

      {msg && (
        <p className={`flex items-center gap-1.5 text-sm ${msg.ok ? "text-emerald-600" : "text-destructive"}`}>
          {msg.ok ? <Check className="size-4" /> : <X className="size-4" />} {msg.text}
        </p>
      )}

      <Button type="button" size="lg" className="h-11 w-full" onClick={submit} disabled={pending}>
        {pending ? "Guardando…" : existing ? "Actualizar registro" : "Guardar registro"}
      </Button>
    </div>
  );
}

function NumField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <Input
        type="number"
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="—"
      />
    </div>
  );
}
