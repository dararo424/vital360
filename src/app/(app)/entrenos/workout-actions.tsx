"use client";

import { useTransition } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { deleteWorkout } from "@/app/actions/workouts";
import { Button } from "@/components/ui/button";

export function DeleteWorkoutButton({ id }: { id: string }) {
  const [pending, start] = useTransition();
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      aria-label="Borrar entreno"
      disabled={pending}
      onClick={() => {
        if (confirm("¿Borrar este entreno?")) start(() => deleteWorkout(id));
      }}
    >
      {pending ? <Loader2 className="animate-spin" /> : <Trash2 className="text-muted-foreground" />}
    </Button>
  );
}
