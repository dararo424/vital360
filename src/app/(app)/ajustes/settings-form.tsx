"use client";

import { useMemo, useState, useTransition } from "react";
import { Check, LogOut, Sparkles, X } from "lucide-react";
import { signOut } from "@/app/actions/auth";
import { setManualGoal, updateProfileAndGoal } from "@/app/actions/settings";
import {
  ACTIVITY_LABELS,
  ACTIVITY_LEVELS,
  SEXES,
  SEX_LABELS,
  type ActivityLevel,
  type Sex,
} from "@/lib/types";
import {
  ageFromBirthDate,
  assessGoalSafety,
  computePlan,
  INTENSITIES,
  INTENSITY_LABELS,
  OBJECTIVES,
  OBJECTIVE_LABELS,
  type Intensity,
  type Objective,
  type SafetyWarning,
} from "@/lib/nutrition-plan";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type ProfileProp = {
  full_name: string;
  sex: Sex | "";
  birth_date: string;
  height_cm: number | null;
  activity_level: ActivityLevel | "";
  objective: Objective | "";
  target_weight_kg: number | null;
  intensity: Intensity | "";
  adaptive: boolean;
};

type Goal = { kcal_target: number; protein_g: number; carbs_g: number; fat_g: number };

export function SettingsForm({
  profile,
  goalCurrent,
  weight,
}: {
  profile: ProfileProp;
  goalCurrent: Goal | null;
  weight: number | null;
}) {
  // ── Perfil + objetivo ──────────────────────────────────────────────────────
  const [p, setP] = useState({
    full_name: profile.full_name,
    sex: profile.sex,
    birth_date: profile.birth_date,
    height_cm: profile.height_cm != null ? String(profile.height_cm) : "",
    activity_level: profile.activity_level,
    objective: profile.objective,
    target_weight_kg: profile.target_weight_kg != null ? String(profile.target_weight_kg) : "",
    intensity: profile.intensity || "equilibrado",
    adaptive: profile.adaptive,
  });
  const setField = <K extends keyof typeof p>(k: K, v: (typeof p)[K]) =>
    setP((prev) => ({ ...prev, [k]: v }));

  const [savingP, startP] = useTransition();
  const [msgP, setMsgP] = useState<{ ok: boolean; text: string } | null>(null);

  const est = useMemo(() => {
    if (!p.sex || !p.birth_date || !p.height_cm || !p.activity_level || !p.objective || !p.intensity || !weight)
      return null;
    return computePlan({
      sex: p.sex,
      age: ageFromBirthDate(p.birth_date),
      height_cm: Number(p.height_cm),
      weight_kg: weight,
      activity_level: p.activity_level,
      objective: p.objective,
      intensity: p.intensity,
      target_weight_kg: p.target_weight_kg ? Number(p.target_weight_kg) : null,
    });
  }, [p, weight]);

  const warnings = useMemo(
    () =>
      assessGoalSafety({
        sex: p.sex || null,
        heightCm: p.height_cm ? Number(p.height_cm) : null,
        currentWeightKg: weight,
        targetWeightKg: p.target_weight_kg ? Number(p.target_weight_kg) : null,
        kcalTarget: est?.daily_kcal ?? null,
      }),
    [p.sex, p.height_cm, p.target_weight_kg, weight, est]
  );

  function saveProfile() {
    setMsgP(null);
    startP(async () => {
      const res = await updateProfileAndGoal({
        full_name: p.full_name,
        sex: p.sex as Sex,
        birth_date: p.birth_date,
        height_cm: p.height_cm,
        activity_level: p.activity_level as ActivityLevel,
        objective: p.objective as Objective,
        target_weight_kg: p.target_weight_kg,
        intensity: p.intensity as Intensity,
        adaptive: p.adaptive,
      });
      if (res && res.ok) setMsgP({ ok: true, text: "Guardado y meta recalculada ✓" });
      else if (res) setMsgP({ ok: false, text: res.error });
    });
  }

  // ── Metas manuales ─────────────────────────────────────────────────────────
  const [g, setG] = useState({
    kcal_target: goalCurrent ? String(goalCurrent.kcal_target) : "",
    protein_g: goalCurrent ? String(goalCurrent.protein_g) : "",
    carbs_g: goalCurrent ? String(goalCurrent.carbs_g) : "",
    fat_g: goalCurrent ? String(goalCurrent.fat_g) : "",
  });
  const setG2 = (k: keyof typeof g, v: string) => setG((prev) => ({ ...prev, [k]: v }));
  const [savingG, startG] = useTransition();
  const [msgG, setMsgG] = useState<{ ok: boolean; text: string } | null>(null);

  const manualWarn = useMemo<SafetyWarning[]>(() => {
    const k = Number(g.kcal_target);
    if (!g.kcal_target || !Number.isFinite(k) || k <= 0) return [];
    const floor = p.sex === "F" ? 1200 : 1500;
    return k < floor
      ? [
          {
            level: "warn",
            message: `Esa meta (${k} kcal) está por debajo del mínimo recomendado (${floor} kcal). Confírmalo con tu nutricionista.`,
          },
        ]
      : [];
  }, [g.kcal_target, p.sex]);

  function saveManual() {
    setMsgG(null);
    startG(async () => {
      const res = await setManualGoal(g);
      if (res && res.ok)
        setMsgG({ ok: true, text: "Metas guardadas ✓ (modo adaptable desactivado)" });
      else if (res) setMsgG({ ok: false, text: res.error });
    });
  }

  return (
    <div className="space-y-5">
      {/* Perfil y objetivo */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Perfil y objetivo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field label="Nombre">
            <Input value={p.full_name} onChange={(e) => setField("full_name", e.target.value)} />
          </Field>
          <Field label="Sexo">
            <Options options={SEXES.map((s) => [s, SEX_LABELS[s]])} value={p.sex} onChange={(v) => setField("sex", v as Sex)} cols={3} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Fecha de nacimiento">
              <Input type="date" value={p.birth_date} onChange={(e) => setField("birth_date", e.target.value)} />
            </Field>
            <Field label="Estatura (cm)">
              <Input type="number" inputMode="numeric" value={p.height_cm} onChange={(e) => setField("height_cm", e.target.value)} />
            </Field>
          </div>
          <Field label="Nivel de actividad">
            <Options vertical options={ACTIVITY_LEVELS.map((a) => [a, ACTIVITY_LABELS[a]])} value={p.activity_level} onChange={(v) => setField("activity_level", v as ActivityLevel)} />
          </Field>
          <Field label="Objetivo">
            <Options vertical options={OBJECTIVES.map((o) => [o, OBJECTIVE_LABELS[o]])} value={p.objective} onChange={(v) => setField("objective", v as Objective)} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Peso meta (kg)">
              <Input type="number" inputMode="decimal" value={p.target_weight_kg} onChange={(e) => setField("target_weight_kg", e.target.value)} placeholder="—" />
            </Field>
            <Field label="Intensidad">
              <Options options={INTENSITIES.map((i) => [i, INTENSITY_LABELS[i]])} value={p.intensity} onChange={(v) => setField("intensity", v as Intensity)} vertical />
            </Field>
          </div>
          <label className="flex items-center gap-2.5 rounded-lg border p-3 text-sm">
            <input type="checkbox" checked={p.adaptive} onChange={(e) => setField("adaptive", e.target.checked)} className="size-4 accent-[var(--primary)]" />
            <span><strong>Modo adaptable:</strong> recalcular mi meta cuando registre peso.</span>
          </label>

          {est && (
            <div className="rounded-xl border bg-primary/5 p-3 text-sm">
              <span className="text-muted-foreground">Nuevo estimado: </span>
              <span className="font-semibold">{est.daily_kcal} kcal</span>
              <span className="text-muted-foreground"> · P {est.protein_g} · C {est.carbs_g} · G {est.fat_g} g</span>
            </div>
          )}
          {warnings.length > 0 && <SafetyBanner warnings={warnings} />}
          {msgP && (
            <p className={cn("flex items-center gap-1.5 text-sm", msgP.ok ? "text-emerald-600" : "text-destructive")}>
              {msgP.ok ? <Check className="size-4" /> : <X className="size-4" />} {msgP.text}
            </p>
          )}
          <Button type="button" size="lg" className="h-11 w-full" onClick={saveProfile} disabled={savingP}>
            {savingP ? "Guardando…" : "Guardar y recalcular meta"}
          </Button>
        </CardContent>
      </Card>

      {/* Metas manuales */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Metas a mano (de tu nutricionista)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Si tu nutri te dio números específicos, ponlos aquí. Reemplazan al estimado
            y se apaga el modo adaptable para no pisarlos.
          </p>
          <div className="grid grid-cols-4 gap-2">
            <NumField label="Kcal" value={g.kcal_target} onChange={(v) => setG2("kcal_target", v)} />
            <NumField label="Prot." value={g.protein_g} onChange={(v) => setG2("protein_g", v)} />
            <NumField label="Carbs" value={g.carbs_g} onChange={(v) => setG2("carbs_g", v)} />
            <NumField label="Grasa" value={g.fat_g} onChange={(v) => setG2("fat_g", v)} />
          </div>
          {manualWarn.length > 0 && <SafetyBanner warnings={manualWarn} />}
          {msgG && (
            <p className={cn("flex items-center gap-1.5 text-sm", msgG.ok ? "text-emerald-600" : "text-destructive")}>
              {msgG.ok ? <Check className="size-4" /> : <X className="size-4" />} {msgG.text}
            </p>
          )}
          <Button type="button" variant="outline" size="lg" className="h-11 w-full" onClick={saveManual} disabled={savingG}>
            {savingG ? "Guardando…" : "Usar estas metas"}
          </Button>
        </CardContent>
      </Card>

      {/* Sesión */}
      <Card>
        <CardContent className="flex items-center justify-between py-4">
          <span className="text-sm text-muted-foreground">
            {weight != null ? `Peso actual: ${weight} kg` : "Sin peso registrado"}
          </span>
          <form action={signOut}>
            <Button type="submit" variant="outline" size="sm" className="h-9">
              <LogOut /> Cerrar sesión
            </Button>
          </form>
        </CardContent>
      </Card>

      <p className="flex items-center justify-center gap-1.5 pb-2 text-xs text-muted-foreground">
        <Sparkles className="size-3.5" /> Tras cambiar tu objetivo, ve a “Tu plan” y pulsa
        “Regenerar” para actualizar entreno y recetas.
      </p>
    </div>
  );
}

function SafetyBanner({ warnings }: { warnings: SafetyWarning[] }) {
  return (
    <div className="space-y-2">
      {warnings.map((w, i) => (
        <div
          key={i}
          className={cn(
            "rounded-xl border p-3 text-xs leading-relaxed",
            w.level === "warn"
              ? "border-amber-500/40 bg-amber-500/10"
              : "border-border bg-muted/40 text-muted-foreground"
          )}
        >
          {w.level === "warn" && <span className="mr-1">💛</span>}
          {w.message}
        </div>
      ))}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (<div className="space-y-1.5"><Label>{label}</Label>{children}</div>);
}
function NumField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1">
      <Label className="text-[11px] text-muted-foreground">{label}</Label>
      <Input type="number" inputMode="decimal" value={value} onChange={(e) => onChange(e.target.value)} className="px-1.5 text-center" />
    </div>
  );
}
function Options({
  options, value, onChange, cols = 1, vertical = false,
}: {
  options: [string, string][]; value: string; onChange: (v: string) => void; cols?: number; vertical?: boolean;
}) {
  return (
    <div className={cn("grid gap-2", vertical ? "grid-cols-1" : cols === 3 ? "grid-cols-3" : "grid-cols-2")}>
      {options.map(([val, lbl]) => (
        <button key={val} type="button" onClick={() => onChange(val)}
          className={cn(
            "rounded-lg border px-3 py-2 text-left text-sm transition-colors",
            value === val ? "border-primary bg-primary/10 font-medium" : "hover:bg-muted"
          )}>
          {lbl}
        </button>
      ))}
    </div>
  );
}
