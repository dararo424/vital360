"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { BookmarkPlus, Loader2, Trash2 } from "lucide-react";
import { deleteTemplate, saveWorkoutAsTemplate } from "@/app/actions/workouts";
import { Button } from "@/components/ui/button";

export function SaveTemplateButton({ workoutId }: { workoutId: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      aria-label="Guardar como plantilla"
      title="Guardar como plantilla"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const res = await saveWorkoutAsTemplate(workoutId);
          if (res.ok) router.refresh();
        })
      }
    >
      {pending ? (
        <Loader2 className="animate-spin" />
      ) : (
        <BookmarkPlus className="size-4 text-muted-foreground" />
      )}
    </Button>
  );
}

export function DeleteTemplateButton({ id }: { id: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      aria-label="Borrar plantilla"
      disabled={pending}
      onClick={() => {
        if (confirm("¿Borrar esta plantilla?"))
          start(async () => {
            await deleteTemplate(id);
            router.refresh();
          });
      }}
    >
      {pending ? <Loader2 className="animate-spin" /> : <Trash2 className="size-4 text-muted-foreground" />}
    </Button>
  );
}
