import type { ReactNode } from "react";
import { requireOnboarded } from "@/lib/dal";
import { BottomNav } from "./bottom-nav";

/**
 * Layout del área autenticada. Exige sesión + onboarding completo.
 * Renderiza el bottom-nav fijo en todas las páginas del grupo.
 */
export default async function AppLayout({ children }: { children: ReactNode }) {
  await requireOnboarded();

  return (
    <div className="bg-app-gradient min-h-dvh">
      <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col">
        <main className="flex-1 px-4 pb-24 pt-5">{children}</main>
        <BottomNav />
      </div>
    </div>
  );
}
