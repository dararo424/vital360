import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Cliente de Supabase para Server Components, Server Actions y Route Handlers.
 * En Next 16 `cookies()` es asíncrono, por eso esta función es async.
 *
 * Nota seguridad: para decisiones de autorización usa siempre `getUser()`
 * (verifica el token contra el servidor de Auth), no `getSession()`.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // `setAll` se llama desde un Server Component: ignorable si el
            // refresh de sesión lo maneja el proxy (proxy.ts).
          }
        },
      },
    }
  );
}
