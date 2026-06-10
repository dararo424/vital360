import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

/**
 * En Next.js 16 el "middleware" se llama Proxy (`proxy.ts`). Misma función:
 * corre antes de completar el request. Aquí refrescamos la sesión de Supabase
 * y protegemos rutas. Las verificaciones de onboarding (que requieren consultar
 * la DB) se hacen en los layouts/páginas, no aquí.
 */
export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Corre en todas las rutas excepto:
     * - _next/static, _next/image (assets)
     * - favicon, manifest, archivos de imagen
     */
    "/((?!api|sw.js|_next/static|_next/image|favicon.ico|manifest.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
