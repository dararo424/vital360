"use client";

import { useActionState, useState } from "react";
import { Check, ChevronLeft, ChevronRight, Leaf } from "lucide-react";
import { completeOnboarding } from "@/app/actions/onboarding";
import {
  ACTIVITY_LABELS,
  ACTIVITY_LEVELS,
  SEX_LABELS,
  SEXES,
  profileStepSchema,
  goalsStepSchema,
} from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const STEPS = ["Perfil", "Metas", "Preferencias", "Listo"] as const;

type Values = {
  full_name: string;
  sex: string;
  birth_date: string;
  height_cm: string;
  activity_level: string;
  kcal: string;
  protein_g: string;
  carbs_g: string;
  fat_g: string;
};

const EMPTY: Values = {
  full_name: "",
  sex: "",
  birth_date: "",
  height_cm: "",
  activity_level: "",
  kcal: "",
  protein_g: "",
  carbs_g: "",
  fat_g: "",
};

export function OnboardingWizard({ defaultName }: { defaultName: string }) {
  const [step, setStep] = useState(0);
  const [values, setValues] = useState<Values>({
    ...EMPTY,
    full_name: defaultName,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [state, action, pending] = useActionState(completeOnboarding, null);

  const set = (key: keyof Values) => (v: string) =>
    setValues((prev) => ({ ...prev, [key]: v }));

  function validateStep(current: number): boolean {
    if (current === 0) {
      const r = profileStepSchema.safeParse({
        full_name: values.full_name,
        sex: values.sex,
        birth_date: values.birth_date,
        height_cm: values.height_cm,
        activity_level: values.activity_level,
      });
      if (!r.success) {
        const fe = r.error.flatten().fieldErrors;
        setErrors(Object.fromEntries(Object.entries(fe).map(([k, v]) => [k, v![0]])));
        return false;
      }
    }
    if (current === 1) {
      const r = goalsStepSchema.safeParse({
        kcal: values.kcal,
        protein_g: values.protein_g,
        carbs_g: values.carbs_g,
        fat_g: values.fat_g,
      });
      if (!r.success) {
        const fe = r.error.flatten().fieldErrors;
        setErrors(Object.fromEntries(Object.entries(fe).map(([k, v]) => [k, v![0]])));
        return false;
      }
    }
    setErrors({});
    return true;
  }

  function next() {
    if (validateStep(step)) setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }
  function back() {
    setErrors({});
    setStep((s) => Math.max(s - 1, 0));
  }

  const kcalFromMacros =
    (Number(values.protein_g) || 0) * 4 +
    (Number(values.carbs_g) || 0) * 4 +
    (Number(values.fat_g) || 0) * 9;
  const kcalDelta = Math.round(kcalFromMacros - (Number(values.kcal) || 0));

  return (
    <div className="mx-auto w-full max-w-md">
      <div className="mb-6 flex items-center gap-2 text-primary">
        <Leaf className="size-6" />
        <span className="text-xl font-semibold tracking-tight">Vital360</span>
      </div>

      {/* Progreso */}
      <ol className="mb-6 flex items-center gap-2">
        {STEPS.map((label, i) => (
          <li key={label} className="flex flex-1 flex-col gap-1.5">
            <div
              className={`h-1.5 rounded-full transition-colors ${
                i <= step ? "bg-primary" : "bg-muted"
              }`}
            />
            <span
              className={`text-xs ${
                i === step ? "font-medium text-foreground" : "text-muted-foreground"
              }`}
            >
              {label}
            </span>
          </li>
        ))}
      </ol>

      <form action={action}>
        {/* Inputs ocultos: mantienen los valores en el FormData del submit */}
        {Object.entries(values).map(([k, v]) => (
          <input key={k} type="hidden" name={k} value={v} />
        ))}

        {/* Paso 1: Perfil */}
        <Section show={step === 0} title="Tu perfil" desc="Datos básicos para personalizar tu seguimiento.">
          <Field label="Nombre" error={errors.full_name}>
            <Input
              value={values.full_name}
              onChange={(e) => set("full_name")(e.target.value)}
              placeholder="Tu nombre"
            />
          </Field>
          <Field label="Sexo" error={errors.sex}>
            <Select value={values.sex} onValueChange={set("sex")}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecciona" />
              </SelectTrigger>
              <SelectContent>
                {SEXES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {SEX_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Fecha de nacimiento" error={errors.birth_date}>
            <Input
              type="date"
              value={values.birth_date}
              onChange={(e) => set("birth_date")(e.target.value)}
            />
          </Field>
          <Field label="Estatura (cm)" error={errors.height_cm}>
            <Input
              type="number"
              inputMode="numeric"
              value={values.height_cm}
              onChange={(e) => set("height_cm")(e.target.value)}
              placeholder="170"
            />
          </Field>
          <Field label="Nivel de actividad" error={errors.activity_level}>
            <Select value={values.activity_level} onValueChange={set("activity_level")}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecciona" />
              </SelectTrigger>
              <SelectContent>
                {ACTIVITY_LEVELS.map((a) => (
                  <SelectItem key={a} value={a}>
                    {ACTIVITY_LABELS[a]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </Section>

        {/* Paso 2: Metas del nutricionista */}
        <Section
          show={step === 1}
          title="Metas de tu nutricionista"
          desc="Carga aquí los macros de tu plan profesional. Vital360 no inventa metas: solo refleja las tuyas."
        >
          <Field label="Calorías (kcal)" error={errors.kcal}>
            <Input
              type="number"
              inputMode="numeric"
              value={values.kcal}
              onChange={(e) => set("kcal")(e.target.value)}
              placeholder="2000"
            />
          </Field>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Proteína (g)" error={errors.protein_g}>
              <Input
                type="number"
                inputMode="numeric"
                value={values.protein_g}
                onChange={(e) => set("protein_g")(e.target.value)}
                placeholder="150"
              />
            </Field>
            <Field label="Carbos (g)" error={errors.carbs_g}>
              <Input
                type="number"
                inputMode="numeric"
                value={values.carbs_g}
                onChange={(e) => set("carbs_g")(e.target.value)}
                placeholder="200"
              />
            </Field>
            <Field label="Grasa (g)" error={errors.fat_g}>
              <Input
                type="number"
                inputMode="numeric"
                value={values.fat_g}
                onChange={(e) => set("fat_g")(e.target.value)}
                placeholder="60"
              />
            </Field>
          </div>
          {kcalFromMacros > 0 && (
            <p className="text-xs text-muted-foreground">
              Los macros suman ~{Math.round(kcalFromMacros)} kcal
              {Math.abs(kcalDelta) > 50 && (
                <span className="text-amber-600">
                  {" "}
                  ({kcalDelta > 0 ? "+" : ""}
                  {kcalDelta} kcal vs lo que pusiste — revísalo con tu nutri).
                </span>
              )}
            </p>
          )}
        </Section>

        {/* Paso 3: Preferencias */}
        <Section
          show={step === 2}
          title="Preferencias"
          desc="Vital360 está para quitarte carga, no para sumarte presión."
        >
          <div className="space-y-3 rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">
            <p>
              El conteo por IA es una <strong>estimación de apoyo</strong>, no una
              medición exacta: siempre podrás editar cada ítem antes de guardar.
            </p>
            <p>
              Cualquier cambio de plan lo decides tú con tu nutricionista; la app
              solo lo refleja y guarda el histórico.
            </p>
            <p>
              Las preferencias de comidas (dietas, alergias, favoritos) las
              ajustarás dentro de la app cuando empieces a registrar.
            </p>
          </div>
        </Section>

        {/* Paso 4: Resumen */}
        <Section show={step === 3} title="Todo listo" desc="Revisa y confirma para empezar.">
          <dl className="divide-y rounded-lg border text-sm">
            <Row k="Nombre" v={values.full_name} />
            <Row k="Sexo" v={SEX_LABELS[values.sex as keyof typeof SEX_LABELS] ?? "—"} />
            <Row k="Nacimiento" v={values.birth_date || "—"} />
            <Row k="Estatura" v={values.height_cm ? `${values.height_cm} cm` : "—"} />
            <Row
              k="Actividad"
              v={ACTIVITY_LABELS[values.activity_level as keyof typeof ACTIVITY_LABELS] ?? "—"}
            />
            <Row k="Meta" v={`${values.kcal} kcal`} />
            <Row
              k="Macros"
              v={`P ${values.protein_g} · C ${values.carbs_g} · G ${values.fat_g} g`}
            />
          </dl>

          {state && !state.ok && (
            <p className="mt-3 text-sm text-destructive">{state.error}</p>
          )}
        </Section>

        {/* Navegación */}
        <div className="mt-6 flex items-center gap-3">
          {step > 0 && (
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="h-11"
              onClick={back}
              disabled={pending}
            >
              <ChevronLeft /> Atrás
            </Button>
          )}
          {step < STEPS.length - 1 ? (
            <Button type="button" size="lg" className="h-11 flex-1" onClick={next}>
              Continuar <ChevronRight />
            </Button>
          ) : (
            <Button type="submit" size="lg" className="h-11 flex-1" disabled={pending}>
              {pending ? "Guardando…" : "Empezar"} <Check />
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}

function Section({
  show,
  title,
  desc,
  children,
}: {
  show: boolean;
  title: string;
  desc: string;
  children: React.ReactNode;
}) {
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

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between px-3 py-2">
      <dt className="text-muted-foreground">{k}</dt>
      <dd className="font-medium">{v}</dd>
    </div>
  );
}
