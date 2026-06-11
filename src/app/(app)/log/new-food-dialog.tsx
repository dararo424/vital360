"use client";

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { createFood } from "@/app/actions/foods";
import { foodSchema, type Food, type FoodInput } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { DecimalInput } from "@/components/ui/decimal-input";
import { Label } from "@/components/ui/label";

type Fields = Record<keyof FoodInput, string>;

const EMPTY: Fields = {
  name: "",
  brand: "",
  serving_g: "100",
  kcal: "",
  protein_g: "",
  carbs_g: "",
  fat_g: "",
  fiber_g: "",
};

export function NewFoodDialog({
  initialName = "",
  onCreated,
}: {
  initialName?: string;
  onCreated: (food: Food) => void;
}) {
  const [open, setOpen] = useState(false);
  const [fields, setFields] = useState<Fields>({ ...EMPTY, name: initialName });
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const set = (k: keyof Fields) => (v: string) =>
    setFields((p) => ({ ...p, [k]: v }));

  function submit() {
    setError(null);
    const parsed = foodSchema.safeParse(fields);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Datos inválidos.");
      return;
    }
    startTransition(async () => {
      const res = await createFood(parsed.data);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      onCreated(res.food);
      setFields({ ...EMPTY });
      setOpen(false);
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) setFields((p) => ({ ...EMPTY, name: initialName || p.name }));
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="lg" className="h-11 w-full">
          <Plus /> Crear alimento nuevo
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nuevo alimento</DialogTitle>
          <DialogDescription>
            Define los macros para una porción de referencia. Luego eliges cuántos
            gramos comiste.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1.5">
              <Label>Nombre</Label>
              <Input
                value={fields.name}
                onChange={(e) => set("name")(e.target.value)}
                placeholder="Pechuga de pollo"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Marca (opcional)</Label>
              <Input
                value={fields.brand}
                onChange={(e) => set("brand")(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Porción (g)</Label>
              <DecimalInput
                value={fields.serving_g}
                onChange={set("serving_g")}
              />
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2">
            <NumField label="Kcal" value={fields.kcal} onChange={set("kcal")} />
            <NumField
              label="Prot."
              value={fields.protein_g}
              onChange={set("protein_g")}
            />
            <NumField
              label="Carbs"
              value={fields.carbs_g}
              onChange={set("carbs_g")}
            />
            <NumField label="Grasa" value={fields.fat_g} onChange={set("fat_g")} />
          </div>
          <p className="text-xs text-muted-foreground">
            Macros para {fields.serving_g || "?"} g.
          </p>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button
            type="button"
            size="lg"
            className="h-11 w-full"
            onClick={submit}
            disabled={pending}
          >
            {pending ? "Guardando…" : "Guardar y agregar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
      <DecimalInput value={value} onChange={onChange} placeholder="0" />
    </div>
  );
}
