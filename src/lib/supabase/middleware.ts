import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Refresca la sesión de Supabase en cada request y aplica protección de rutas.
 * Se invoca desde `proxy.ts` (el antiguo middleware, renombrado en Next 16).
 *
 * IMPORTANTE: hay que llamar a `getUser()` antes de generar la respuesta para
 * que un eventual refresh de token pueda escribir las cookies actualizadas.
 */

// Rutas públicas a las que se puede acceder sin sesión.
const PUBLIC_ROUTES = ["/login", "/signup", "/auth", "/legal", "/offline"];

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
          // Evita que CDNs/proxies cacheen respuestas con cookies de sesión.
          if (headers) {
            Object.entries(headers).forEach(([key, value]) =>
              supabaseResponse.headers.set(key, value)
            );
          }
        },
      },
    }
  );

  // No metas lógica entre createServerClient y getUser(): podría causar
  // sesiones cerradas aleatorias.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isPublic = PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );

  // No autenticado en ruta protegida → login.
  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirectedFrom", pathname);
    return NextResponse.redirect(url);
  }

  // Autenticado en login/signup → dashboard.
  if (user && (pathname === "/login" || pathname === "/signup")) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  // Devuelve supabaseResponse intacto para no romper la sincronización de
  // cookies entre el navegador y el servidor.
  return supabaseResponse;
}
