"use client";

import { useState, useTransition } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { analyzeNutrition, type NutritionInsight } from "@/app/actions/insight";
import { Button } from "@/components/ui/button";

export function NutritionCoach() {
  const [pending, start] = useTransition();
  const [insight, setInsight] = useState<NutritionInsight | null>(null);
  const [error, setError] = useState<string | null>(null);

  function run() {
    setError(null);
    start(async () => {
      const res = await analyzeNutrition();
      if (res.ok) setInsight(res.insight);
      else setError(res.error);
    });
  }

  return (
    <div className="space-y-3">
      {!insight && (
        <p className="text-sm text-muted-foreground">
          La IA revisa lo que comiste esta semana y te da consejos según tus metas
          (qué subir, bajar o sustituir).
        </p>
      )}

      {insight && (
        <div className="space-y-2.5">
          <p className="text-sm">{insight.summary}</p>
          <ul className="space-y-1.5">
            {insight.tips.map((t, i) => (
              <li key={i} className="flex gap-2 text-sm">
                <span className="text-primary">•</span>
                <span>{t}</span>
              </li>
            ))}
          </ul>
          <p className="text-[11px] text-muted-foreground">
            Sugerencias generadas con IA. Valídalas con tu nutricionista.
          </p>
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button
        type="button"
        variant={insight ? "outline" : "default"}
        className="h-10 w-full"
        onClick={run}
        disabled={pending}
      >
        {pending ? (
          <>
            <Loader2 className="animate-spin" /> Analizando…
          </>
        ) : (
          <>
            <Sparkles /> {insight ? "Analizar de nuevo" : "Analiza mi semana"}
          </>
        )}
      </Button>
    </div>
  );
}
