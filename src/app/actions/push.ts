"use server";

import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/dal";

type SubInput = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
};

/** Guarda (o actualiza) la suscripción push del usuario. */
export async function savePushSubscription(
  sub: SubInput
): Promise<{ ok: boolean; error?: string }> {
  const user = await getUser();
  if (!user) return { ok: false, error: "Sesión expirada." };
  if (!sub?.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) {
    return { ok: false, error: "Suscripción inválida." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: user.id,
      endpoint: sub.endpoint,
      p256dh: sub.keys.p256dh,
      auth: sub.keys.auth,
    },
    { onConflict: "endpoint" }
  );
  if (error) return { ok: false, error: "No se pudo activar." };
  return { ok: true };
}

/** Elimina una suscripción (al desactivar). */
export async function deletePushSubscription(endpoint: string): Promise<void> {
  const user = await getUser();
  if (!user || !endpoint) return;
  const supabase = await createClient();
  await supabase
    .from("push_subscriptions")
    .delete()
    .eq("endpoint", endpoint)
    .eq("user_id", user.id);
}
