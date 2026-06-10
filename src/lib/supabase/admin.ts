import "server-only";

import { createClient } from "@supabase/supabase-js";

/**
 * Cliente Supabase con service_role (omite RLS). SOLO para server actions que
 * ya verificaron permisos (ej. acceso de un coach a su cliente vinculado) o el
 * cron. Nunca exponer al navegador.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY no configurada.");
  }
  return createClient(url, key, { auth: { persistSession: false } });
}
