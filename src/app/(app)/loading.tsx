import { Skeleton } from "@/components/ui/skeleton";

/**
 * Fallback de carga para cualquier pantalla del área principal. Se muestra al
 * instante al navegar entre menús, mientras la página carga sus datos, para que
 * se note que el toque sí registró.
 */
export default function Loading() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Cargando">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-24 w-full rounded-xl" />
      <Skeleton className="h-44 w-full rounded-xl" />
      <Skeleton className="h-32 w-full rounded-xl" />
    </div>
  );
}
