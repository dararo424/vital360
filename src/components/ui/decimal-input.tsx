"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";

/**
 * Input numérico que acepta coma o punto como separador decimal (es-CO usa
 * coma) y lo normaliza a punto en `onChange`. Así todo lo que está aguas abajo
 * (cálculos y servidor) recibe siempre punto y `Number()` funciona.
 *
 * Pensado para valores guardados como string. Para campos guardados como número
 * usa un input normal (los enteros no necesitan coma).
 */
export function DecimalInput({
  value,
  onChange,
  ...props
}: {
  value: string;
  onChange: (value: string) => void;
} & Omit<React.ComponentProps<"input">, "value" | "onChange" | "type">) {
  return (
    <Input
      type="text"
      inputMode="decimal"
      value={value}
      onChange={(e) => onChange(e.target.value.replace(",", "."))}
      {...props}
    />
  );
}
