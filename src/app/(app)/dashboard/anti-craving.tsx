"use client";

import { useState, useTransition } from "react";
import { Heart, Loader2, Sparkles, Timer, UtensilsCrossed } from "lucide-react";
import { getAntiCravingHelp, type CravingHelp } from "@/app/actions/craving";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const CRAVINGS = [
  "Algo dulce",
  "Frito / chatarra",
  "Snack salado",
  "Gaseosa",
  "Pan / harinas",
  "Comida rápida",
];
const REASONS = ["Hambre", "Ansiedad", "Aburrimiento", "Costumbre"];

const KIND_META: Record<string, { icon: typeof Heart; tone: string; label: string }> = {
  receta: { icon: UtensilsCrossed, tone: "text-emerald-600", label: "Opción que satisface" },
  truco: { icon: Timer, tone: "text-sky-600", label: "Truco sin calorías" },
  gusto: { icon: Heart, tone: "text-rose-500", label: "Date el gusto, consciente" },
};

export function AntiCraving() {
  const [open, setOpen] = useState(false);
  const [craving, setCraving] = useState("");
  const [reason, setReason] = useState("");
  const [help, setHelp] = useState<CravingHelp | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function reset() {
    setCraving("");
    setReason("");
    setHelp(null);
    setError(null);
  }

  function ask() {
    if (!craving.trim()) return;
    setError(null);
    start(async () => {
      const res = await getAntiCravingHelp(craving, reason || undefined);
      if (res.ok) setHelp(res.help);
      else setError(res.error);
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button type="button" variant="outline" className="h-11 w-full border-rose-300/50 text-rose-600">
          <Heart /> Se me antoja algo
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>{help ? "Aquí tienes" : "¿Qué se te antoja?"}</DialogTitle>
        </DialogHeader>

        {!help ? (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-1.5">
              {CRAVINGS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCraving(c)}
                  className={cn(
                    "rounded-full border px-2.5 py-1 text-xs transition-colors",
                    craving === c ? "border-primary bg-primary/10 font-medium" : "hover:bg-muted"
                  )}
                >
                  {c}
                </button>
              ))}
            </div>
            <Input
              value={craving}
              onChange={(e) => setCraving(e.target.value)}
              placeholder="…o escríbelo (ej. helado de chocolate)"
            />

            <div>
              <p className="mb-1.5 text-xs text-muted-foreground">¿Por qué crees que es? (opcional)</p>
              <div className="flex flex-wrap gap-1.5">
                {REASONS.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setReason(reason === r ? "" : r)}
                    className={cn(
                      "rounded-full border px-2.5 py-1 text-xs transition-colors",
                      reason === r ? "border-primary bg-primary/10 font-medium" : "hover:bg-muted"
                    )}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button
              type="button"
              size="lg"
              className="h-11 w-full"
              onClick={ask}
              disabled={pending || !craving.trim()}
            >
              {pending ? (
                <>
                  <Loader2 className="animate-spin" /> Pensando…
                </>
              ) : (
                <>
                  <Sparkles /> Ayúdame
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm">{help.message}</p>
            <ul className="space-y-2">
              {help.options.map((o, i) => {
                const meta = KIND_META[o.kind] ?? KIND_META.receta;
                const Icon = meta.icon;
                return (
                  <li key={i} className="rounded-lg border p-3">
                    <p className={cn("flex items-center gap-1.5 text-sm font-medium", meta.tone)}>
                      <Icon className="size-4" /> {o.title}
                    </p>
                    <p className="mt-0.5 text-sm text-muted-foreground">{o.detail}</p>
                  </li>
                );
              })}
            </ul>
            <Button type="button" variant="outline" className="h-10 w-full" onClick={reset}>
              Otro antojo
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
