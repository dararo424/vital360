"use client";

import { useTransition } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { deleteBodyMetric } from "@/app/actions/progress";
import { Button } from "@/components/ui/button";

export function DeleteMetricButton({ id }: { id: string }) {
  const [pending, start] = useTransition();
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      aria-label="Borrar registro"
      disabled={pending}
      onClick={() => {
        if (confirm("¿Borrar este registro?")) start(() => deleteBodyMetric(id));
      }}
    >
      {pending ? (
        <Loader2 className="animate-spin" />
      ) : (
        <Trash2 className="size-4 text-muted-foreground" />
      )}
    </Button>
  );
}
