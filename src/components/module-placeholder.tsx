import type { LucideIcon } from "lucide-react";

/**
 * Placeholder de módulo. Los módulos reales se construyen en días posteriores
 * del Plan Maestro (registro de comida, recetas, entrenos, progreso).
 */
export function ModulePlaceholder({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
      <div className="flex size-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Icon className="size-7" />
      </div>
      <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
      <p className="max-w-xs text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
