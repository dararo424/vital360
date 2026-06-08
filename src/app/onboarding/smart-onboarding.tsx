"use client";

import { useMemo, useState, useTransition } from "react";
import { ChevronLeft, ChevronRight, Leaf, Loader2, Sparkles } from "lucide-react";
import { completeSmartOnboarding } from "@/app/actions/onboarding";
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
  BUDGET,
  COOK_TIME,
  computePlan,
  CRAVINGS,
  EATS_OUT,
  FAIL_MEALS,
  INTENSITIES,
  INTENSITY_HINTS,
  INTENSITY_LABELS,
  OBJECTIVES,
  OBJECTIVE_HINTS,
  OBJECTIVE_LABELS,
  PLACES,
  recommendObjective,
  WORK_TYPES,
  type Intensity,
  type Objective,
} from "@/lib/nutrition-plan";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const STEPS = ["Tú", "Estilo de vida", "Hábitos", "Objetivo", "Tu plan"] as const;

type Q = {
  work_type: string;
  place: string;
  training_days: string;
  sleep_hours: string;
  meals_per_day: string;
  fail_meal: string[];
  cravings: string[];
  eats_out: string;
  allergies: string;
  dislikes: string;
  cook_time: string;
  budget: string;
};

type V = {
  full_name: string;
  sex: Sex | "";
  birth_date: string;
  height_cm: string;
  weight_kg: string;
  activity_level: ActivityLevel | "";
  objective: Objective | "";
  target_weight_kg: string;
  intensity: Intensity | "";
  adaptive: boolean;
  q: Q;
};

const INIT: V = {
  full_name: "",
  sex: "",
  birth_date: "",
  height_cm: "",
  weight_kg: "",
  activity_level: "",
  objective: "",
  target_weight_kg: "",
  intensity: "equilibrado",
  adaptive: true,
  q: {
    work_type: "", place: "", training_days: "", sleep_hours: "", meals_per_day: "",
    fail_meal: [], cravings: [], eats_out: "", allergies: "", dislikes: "", cook_time: "", budget: "",
  },
};

export function SmartOnboarding({ defaultName }: { defaultName: string }) {
  const [step, setStep] = useState(0);
  const [v, setV] = useState<V>({ ...INIT, full_name: defaultName });
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const set = <K extends keyof V>(k: K, val: V[K]) => setV((p) => ({ ...p, [k]: val }));
  const setQ = <K extends keyof Q>(k: K, val: Q[K]) =>
    setV((p) => ({ ...p, q: { ...p.q, [k]: val } }));
  const toggle = (k: "fail_meal" | "cravings", val: string) =>
    setV((p) => ({
      ...p,
      q: { ...p.q, [k]: p.q[k].includes(val) ? p.q[k].filter((x) => x !== val) : [...p.q[k], val] },
    }));

  const recommended = useMemo(
    () =>
      v.height_cm && v.weight_kg
        ? recommendObjective(Number(v.height_cm), Number(v.weight_kg))
        : null,
    [v.height_cm, v.weight_kg]
  );

  const estimate = useMemo(() => {
    if (!v.sex || !v.birth_date || !v.height_cm || !v.weight_kg || !v.activity_level || !v.objective || !v.intensity)
      return null;
    return computePlan({
      sex: v.sex,
      age: ageFromBirthDate(v.birth_date),
      height_cm: Number(v.height_cm),
      weight_kg: Number(v.weight_kg),
      activity_level: v.activity_level,
      objective: v.objective,
      intensity: v.intensity,
      target_weight_kg: v.target_weight_kg ? Number(v.target_weight_kg) : null,
    });
  }, [v]);

  function validate(s: number): boolean {
    if (s === 0) {
      if (!v.full_name.trim()) return fail("Tu nombre");
      if (!v.sex) return fail("Selecciona tu sexo");
      if (!v.birth_date) return fail("Tu fecha de nacimiento");
      if (!v.height_cm) return fail("Tu estatura");
      if (!v.weight_kg) return fail("Tu peso");
    }
    if (s === 1 && !v.activity_level) return fail("Tu nivel de actividad");
    if (s === 3) {
      if (!v.objective) return fail("Tu objetivo");
      if (!v.intensity) return fail("La intensidad");
    }
    setError(null);
    return true;
  }
  function fail(msg: string): boolean {
    setError(`Falta: ${msg}.`);
    return false;
  }
  function next() {
    if (validate(step)) setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }
  function back() {
    setError(null);
    setStep((s) => Math.max(s - 1, 0));
  }

  function submit() {
    if (!validate(0) || !validate(3)) {
      setStep(!v.full_name || !v.sex || !v.birth_date || !v.height_cm || !v.weight_kg ? 0 : 3);
      return;
    }
    start(async () => {
      const res = await completeSmartOnboarding({
        full_name: v.full_name,
        sex: v.sex as Sex,
        birth_date: v.birth_date,
        height_cm: v.height_cm,
        weight_kg: v.weight_kg,
        activity_level: v.activity_level as ActivityLevel,
        objective: v.objective as Objective,
        target_weight_kg: v.target_weight_kg,
        intensity: v.intensity as Intensity,
        adaptive: v.adaptive,
        questionnaire: v.q,
      });
      if (res && !res.ok) setError(res.error);
    });
  }

  if (pending) return <Generating />;

  return (
    <div className="mx-auto w-full max-w-md">
      <div className="mb-5 flex items-center gap-2">
        <span className="flex size-8 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <Leaf className="size-5" />
        </span>
        <span className="text-gradient-brand text-xl font-semibold tracking-tight">
          Vital360
        </span>
      </div>

      <ol className="mb-6 flex items-center gap-1.5">
        {STEPS.map((label, i) => (
          <li key={label} className="flex flex-1 flex-col gap-1.5">
            <div className={cn("h-1.5 rounded-full transition-colors", i <= step ? "bg-primary" : "bg-muted")} />
            <span className={cn("text-[11px]", i === step ? "font-medium text-foreground" : "text-muted-foreground")}>{label}</span>
          </li>
        ))}
      </ol>

      {/* PASO 1 — Cuerpo */}
      <Section show={step === 0} title="Cuéntanos de ti" desc="Con esto calculamos tu base.">
        <Field label="Nombre"><Input value={v.full_name} onChange={(e) => set("full_name", e.target.value)} placeholder="Tu nombre" /></Field>
        <Field label="Sexo"><Options options={SEXES.map((s) => [s, SEX_LABELS[s]])} value={v.sex} onChange={(x) => set("sex", x as Sex)} cols={3} /></Field>
        <Field label="Fecha de nacimiento"><Input type="date" value={v.birth_date} onChange={(e) => set("birth_date", e.target.value)} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Estatura (cm)"><Input type="number" inputMode="numeric" value={v.height_cm} onChange={(e) => set("height_cm", e.target.value)} placeholder="170" /></Field>
          <Field label="Peso (kg)"><Input type="number" inputMode="decimal" value={v.weight_kg} onChange={(e) => set("weight_kg", e.target.value)} placeholder="80" /></Field>
        </div>
      </Section>

      {/* PASO 2 — Estilo de vida */}
      <Section show={step === 1} title="Tu estilo de vida" desc="Para ajustar tu gasto energético y el entreno.">
        <Field label="Nivel de actividad diaria"><Options vertical options={ACTIVITY_LEVELS.map((a) => [a, ACTIVITY_LABELS[a]])} value={v.activity_level} onChange={(x) => set("activity_level", x as ActivityLevel)} /></Field>
        <Field label="Tu trabajo"><Options options={Object.entries(WORK_TYPES)} value={v.q.work_type} onChange={(x) => setQ("work_type", x)} /></Field>
        <Field label="¿Dónde entrenas?"><Options options={Object.entries(PLACES)} value={v.q.place} onChange={(x) => setQ("place", x)} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Días/semana para entrenar"><Input type="number" inputMode="numeric" value={v.q.training_days} onChange={(e) => setQ("training_days", e.target.value)} placeholder="4" /></Field>
          <Field label="Horas de sueño"><Input type="number" inputMode="decimal" value={v.q.sleep_hours} onChange={(e) => setQ("sleep_hours", e.target.value)} placeholder="7" /></Field>
        </div>
      </Section>

      {/* PASO 3 — Hábitos y antojos */}
      <Section show={step === 2} title="Tus hábitos" desc="Para que el plan sea realista y a tu medida.">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Comidas al día"><Input type="number" inputMode="numeric" value={v.q.meals_per_day} onChange={(e) => setQ("meals_per_day", e.target.value)} placeholder="3" /></Field>
          <Field label="¿Comes fuera?"><Options small options={Object.entries(EATS_OUT)} value={v.q.eats_out} onChange={(x) => setQ("eats_out", x)} /></Field>
        </div>
        <Field label="¿Dónde fallas más? (varios)"><Chips options={Object.entries(FAIL_MEALS)} values={v.q.fail_meal} onToggle={(x) => toggle("fail_meal", x)} /></Field>
        <Field label="Tus antojos (varios)"><Chips options={Object.entries(CRAVINGS)} values={v.q.cravings} onToggle={(x) => toggle("cravings", x)} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Tiempo para cocinar"><Options small options={Object.entries(COOK_TIME)} value={v.q.cook_time} onChange={(x) => setQ("cook_time", x)} /></Field>
          <Field label="Presupuesto"><Options small options={Object.entries(BUDGET)} value={v.q.budget} onChange={(x) => setQ("budget", x)} /></Field>
        </div>
        <Field label="Alergias / intolerancias"><Input value={v.q.allergies} onChange={(e) => setQ("allergies", e.target.value)} placeholder="Ej. lactosa, maní…" /></Field>
        <Field label="Alimentos que NO te gustan"><Input value={v.q.dislikes} onChange={(e) => setQ("dislikes", e.target.value)} placeholder="Ej. pescado, cilantro…" /></Field>
      </Section>

      {/* PASO 4 — Objetivo */}
      <Section show={step === 3} title="Tu objetivo" desc="La app sugiere, pero tú decides.">
        <Field label="¿Qué quieres lograr?">
          <Options vertical
            options={OBJECTIVES.map((o) => [o, OBJECTIVE_LABELS[o] + (o === recommended ? "  · sugerido" : "")])}
            value={v.objective} onChange={(x) => set("objective", x as Objective)} />
          {v.objective && <p className="mt-1.5 text-xs text-muted-foreground">{OBJECTIVE_HINTS[v.objective]}</p>}
        </Field>
        <Field label="Peso meta (kg, opcional)"><Input type="number" inputMode="decimal" value={v.target_weight_kg} onChange={(e) => set("target_weight_kg", e.target.value)} placeholder="73" /></Field>
        <Field label="Intensidad del plan">
          <Options vertical options={INTENSITIES.map((i) => [i, INTENSITY_LABELS[i]])} value={v.intensity} onChange={(x) => set("intensity", x as Intensity)} />
          {v.intensity && <p className="mt-1.5 text-xs text-muted-foreground">{INTENSITY_HINTS[v.intensity]}</p>}
        </Field>
        <label className="flex items-center gap-2.5 rounded-lg border p-3 text-sm">
          <input type="checkbox" checked={v.adaptive} onChange={(e) => set("adaptive", e.target.checked)} className="size-4 accent-[var(--primary)]" />
          <span><strong>Plan adaptable:</strong> que se recalcule cuando cambien mis datos.</span>
        </label>
        {estimate && <EstimatePreview est={estimate} />}
      </Section>

      {/* PASO 5 — Resumen */}
      <Section show={step === 4} title="Todo listo" desc="Generamos tu estimado y un plan personalizado con IA.">
        {estimate ? (
          <>
            <EstimatePreview est={estimate} />
            <div className="rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground">
              Al continuar, la IA crea tu plan de entreno, consejos y recetas anti-antojo
              dentro de estos macros. Tarda ~30 segundos. Todo es <strong>editable</strong> y
              un punto de partida — valídalo con tu nutricionista.
            </div>
          </>
        ) : (
          <p className="text-sm text-destructive">Vuelve y completa tu objetivo para ver el estimado.</p>
        )}
      </Section>

      {error && <p className="mt-4 text-sm text-destructive">{error}</p>}

      <div className="mt-6 flex items-center gap-3">
        {step > 0 && <Button type="button" variant="outline" size="lg" className="h-11" onClick={back}><ChevronLeft /> Atrás</Button>}
        {step < STEPS.length - 1 ? (
          <Button type="button" size="lg" className="h-11 flex-1" onClick={next}>Continuar <ChevronRight /></Button>
        ) : (
          <Button type="button" size="lg" className="h-11 flex-1" onClick={submit} disabled={!estimate}>
            <Sparkles /> Generar mi plan
          </Button>
        )}
      </div>
    </div>
  );
}

function Generating() {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center gap-4 text-center">
      <div className="relative">
        <Loader2 className="size-12 animate-spin text-primary" />
        <Sparkles className="absolute inset-0 m-auto size-5 text-primary" />
      </div>
      <h2 className="text-xl font-semibold">Creando tu plan…</h2>
      <p className="max-w-xs text-sm text-muted-foreground">
        La IA está armando tu entreno, consejos y recetas anti-antojo dentro de tus
        macros. Esto toma unos segundos.
      </p>
    </div>
  );
}

function EstimatePreview({ est }: { est: ReturnType<typeof computePlan> }) {
  const meses = est.weeks_to_target ? Math.round(est.weeks_to_target / 4.33) : null;
  return (
    <div className="rounded-xl border bg-primary/5 p-4">
      <p className="text-xs font-medium text-muted-foreground">Tu estimado diario</p>
      <p className="text-3xl font-semibold tabular-nums">{est.daily_kcal} <span className="text-base font-normal text-muted-foreground">kcal</span></p>
      <div className="mt-2 grid grid-cols-3 gap-2 text-center text-sm">
        <Macro label="Proteína" v={est.protein_g} />
        <Macro label="Carbos" v={est.carbs_g} />
        <Macro label="Grasa" v={est.fat_g} />
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        Mantenimiento ~{est.tdee} kcal · ritmo ~{Math.abs(est.weekly_rate_kg)} kg/semana
        {meses ? ` · meta en ~${meses} mes${meses === 1 ? "" : "es"}` : ""}.
      </p>
      {est.warnings.map((w, i) => (
        <p key={i} className="mt-1.5 text-xs text-amber-600">⚠️ {w}</p>
      ))}
    </div>
  );
}
function Macro({ label, v }: { label: string; v: number }) {
  return (
    <div className="rounded-lg bg-background p-2">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="font-semibold tabular-nums">{v} g</p>
    </div>
  );
}

function Section({ show, title, desc, children }: { show: boolean; title: string; desc: string; children: React.ReactNode }) {
  return (
    <div hidden={!show} className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
        <p className="text-sm text-muted-foreground">{desc}</p>
      </div>
      {children}
    </div>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (<div className="space-y-1.5"><Label>{label}</Label>{children}</div>);
}
function Options({
  options, value, onChange, cols = 1, vertical = false, small = false,
}: {
  options: [string, string][]; value: string; onChange: (v: string) => void;
  cols?: number; vertical?: boolean; small?: boolean;
}) {
  return (
    <div className={cn("grid gap-2", vertical ? "grid-cols-1" : cols === 3 ? "grid-cols-3" : "grid-cols-2")}>
      {options.map(([val, lbl]) => (
        <button key={val} type="button" onClick={() => onChange(val)}
          className={cn(
            "rounded-lg border text-left transition-colors",
            small ? "px-2 py-1.5 text-xs" : "px-3 py-2 text-sm",
            value === val ? "border-primary bg-primary/10 font-medium" : "hover:bg-muted"
          )}>
          {lbl}
        </button>
      ))}
    </div>
  );
}
function Chips({ options, values, onToggle }: { options: [string, string][]; values: string[]; onToggle: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map(([val, lbl]) => (
        <button key={val} type="button" onClick={() => onToggle(val)}
          className={cn(
            "rounded-full border px-3 py-1.5 text-xs transition-colors",
            values.includes(val) ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted"
          )}>
          {lbl}
        </button>
      ))}
    </div>
  );
}
