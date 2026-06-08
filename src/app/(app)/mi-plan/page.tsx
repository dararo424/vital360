import type { Metadata } from "next";
import {
  Dumbbell,
  Lightbulb,
  Sparkles,
  Target,
  Utensils,
  Video,
} from "lucide-react";
import { getProfile, requireOnboarded } from "@/lib/dal";
import {
  INTENSITY_LABELS,
  OBJECTIVE_LABELS,
  type Intensity,
  type Objective,
} from "@/lib/nutrition-plan";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  GeneratePlanPhotoButton,
  RegenerateButton,
  SaveRecipeButton,
} from "./plan-actions";

export const metadata: Metadata = { title: "Tu plan · Vital360" };
export const maxDuration = 60; // regeneración con IA

/* eslint-disable @typescript-eslint/no-explicit-any */
export default async function MiPlanPage() {
  const { profile: base } = await requireOnboarded();
  const profile = (await getProfile()) as any;
  const plan = profile?.plan as any;
  const est = plan?.estimate;

  const objLabel = base.objective
    ? OBJECTIVE_LABELS[base.objective as Objective] ?? base.objective
    : null;
  const intLabel = base.intensity
    ? INTENSITY_LABELS[base.intensity as Intensity] ?? base.intensity
    : null;

  return (
    <div className="space-y-5">
      <header className="flex items-start justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Tu plan</h1>
          {objLabel && (
            <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Target className="size-3.5" /> {objLabel}
              {intLabel ? ` · ${intLabel}` : ""}
            </p>
          )}
        </div>
        <RegenerateButton />
      </header>

      {!plan ? (
        <Card>
          <CardContent className="space-y-3 py-8 text-center">
            <Sparkles className="mx-auto size-8 text-primary" />
            <p className="text-sm text-muted-foreground">
              Aún no tienes un plan generado (o la IA no respondió la última vez).
              Pulsa “Regenerar” para crearlo.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Estimado */}
          {est && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Tu estimado diario</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-semibold tabular-nums">
                  {est.daily_kcal}
                  <span className="text-base font-normal text-muted-foreground"> kcal</span>
                </p>
                <div className="mt-2 grid grid-cols-3 gap-2 text-center text-sm">
                  {[
                    ["Proteína", est.protein_g],
                    ["Carbos", est.carbs_g],
                    ["Grasa", est.fat_g],
                  ].map(([l, v]) => (
                    <div key={l} className="rounded-lg border bg-muted/30 p-2">
                      <p className="text-[11px] text-muted-foreground">{l}</p>
                      <p className="font-semibold tabular-nums">{v} g</p>
                    </div>
                  ))}
                </div>
                <p className="mt-3 text-xs text-muted-foreground">
                  Mantenimiento ~{est.tdee} kcal · ritmo ~{Math.abs(est.weekly_rate_kg)} kg/sem
                  {est.weeks_to_target ? ` · meta en ~${Math.round(est.weeks_to_target / 4.33)} meses` : ""}.
                </p>
                {(est.warnings ?? []).map((w: string, i: number) => (
                  <p key={i} className="mt-1 text-xs text-amber-600">⚠️ {w}</p>
                ))}
                <p className="mt-3 rounded-md bg-muted/40 p-2 text-[11px] text-muted-foreground">
                  Estimación de apoyo y editable, no una prescripción médica. Valídala
                  con tu nutricionista.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Resumen */}
          {plan.summary && (
            <Card>
              <CardContent className="py-4">
                <p className="text-sm leading-relaxed">{plan.summary}</p>
              </CardContent>
            </Card>
          )}

          {/* Entreno */}
          {plan.training && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Dumbbell className="size-4" /> Entreno · {plan.training.days_per_week} días/semana
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="mb-3 text-sm text-muted-foreground">{plan.training.focus}</p>
                <div className="space-y-2">
                  {(plan.training.sessions ?? []).map((s: any, i: number) => (
                    <details key={i} className="rounded-lg border p-3">
                      <summary className="cursor-pointer text-sm font-medium">
                        {s.name} <span className="text-muted-foreground">· {s.focus}</span>
                      </summary>
                      <ul className="mt-2 list-disc space-y-0.5 pl-5 text-sm text-muted-foreground">
                        {(s.exercises ?? []).map((ex: string, j: number) => <li key={j}>{ex}</li>)}
                      </ul>
                    </details>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Consejos */}
          {plan.habit_tips?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Lightbulb className="size-4 text-amber-500" /> Consejos para ti
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  {plan.habit_tips.map((t: string, i: number) => (
                    <li key={i} className="flex gap-2">
                      <span className="text-primary">•</span>
                      <span>{t}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Anti-antojos */}
          {plan.craving_busters?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">🍫➜🍎 Calma tus antojos</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2.5 text-sm">
                  {plan.craving_busters.map((c: any, i: number) => (
                    <li key={i}>
                      <span className="font-medium">{c.craving}</span>
                      <p className="text-muted-foreground">{c.swap}</p>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Recetas */}
          {plan.recipes?.length > 0 && (
            <div className="space-y-3">
              <h2 className="flex items-center gap-2 text-lg font-semibold">
                <Utensils className="size-4" /> Recetas recomendadas
              </h2>
              {plan.recipes.map((r: any, i: number) => (
                <Card key={i} className="overflow-hidden">
                  {r.image_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={r.image_url}
                      alt={r.title}
                      className="h-44 w-full object-cover"
                    />
                  )}
                  <CardContent className="space-y-3 py-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium">{r.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {Math.round(r.kcal_per_serving)} kcal/porción · P {r.protein_g} · C {r.carbs_g} · G {r.fat_g} g · {r.servings} porc.
                        </p>
                      </div>
                    </div>

                    <details className="rounded-lg border p-3">
                      <summary className="cursor-pointer text-sm font-medium">Ingredientes y preparación</summary>
                      <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Ingredientes</p>
                      <ul className="mb-3 text-sm">
                        {(r.ingredients ?? []).map((ing: any, j: number) => (
                          <li key={j} className="flex justify-between">
                            <span>{ing.name}</span>
                            <span className="text-muted-foreground">{ing.quantity_g} g</span>
                          </li>
                        ))}
                      </ul>
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Preparación</p>
                      <ol className="list-decimal space-y-1 pl-5 text-sm">
                        {(r.steps ?? []).map((s: string, j: number) => <li key={j}>{s}</li>)}
                      </ol>
                    </details>

                    <div className="flex flex-wrap items-center gap-2">
                      <SaveRecipeButton recipe={r} />
                      <GeneratePlanPhotoButton index={i} />
                      {r.video_search && (
                        <Button asChild variant="ghost" size="sm" className="h-8">
                          <a
                            href={`https://www.youtube.com/results?search_query=${encodeURIComponent(r.video_search)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Video /> Ver video
                          </a>
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
