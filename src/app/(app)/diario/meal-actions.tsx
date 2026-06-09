"use client";

import { useTransition } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { deleteFoodLog } from "@/app/actions/foods";
import { Button } from "@/components/ui/button";

export function DeleteMealButton({ id }: { id: string }) {
  const [pending, start] = useTransition();
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      aria-label="Borrar comida"
      disabled={pending}
      onClick={() => {
        if (confirm("¿Borrar esta comida?")) start(() => deleteFoodLog(id));
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
