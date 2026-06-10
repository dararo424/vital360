import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Cron diario (Vercel) que envía un recordatorio push a los usuarios que aún
 * no registraron comida hoy. Vercel agrega `Authorization: Bearer <CRON_SECRET>`.
 */
export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!url || !serviceKey || !pub || !priv) {
    return Response.json(
      { ok: false, error: "Faltan variables de entorno (service role / VAPID)." },
      { status: 500 }
    );
  }

  webpush.setVapidDetails("mailto:dararo424@gmail.com", pub, priv);
  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false },
  });

  // "Hoy" en la zona de la app (no UTC), para no recordar a quien ya registró.
  const tz = process.env.NEXT_PUBLIC_APP_TZ || "America/Bogota";
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(new Date());
  const { data: logs } = await supabase
    .from("food_logs")
    .select("user_id")
    .eq("log_date", today);
  const logged = new Set((logs ?? []).map((r: any) => r.user_id));

  const { data: subs } = await supabase.from("push_subscriptions").select("*");

  const payload = JSON.stringify({
    title: "Vital360 🌱",
    body: "¿Ya registraste tus comidas de hoy? Mantén tu racha 🔥",
    url: "/log",
  });

  let sent = 0;
  let removed = 0;
  for (const s of (subs as any[]) ?? []) {
    if (logged.has(s.user_id)) continue; // ya registró: no molestar
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        payload
      );
      sent++;
    } catch (e: any) {
      if (e?.statusCode === 404 || e?.statusCode === 410) {
        await supabase.from("push_subscriptions").delete().eq("endpoint", s.endpoint);
        removed++;
      }
    }
  }

  return Response.json({ ok: true, sent, removed });
}
