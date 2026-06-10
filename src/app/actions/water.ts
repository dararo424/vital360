"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getUser, today } from "@/lib/dal";

/** Suma (o resta, si delta < 0) ml de agua al registro de hoy. */
export async function addWater(delta: number): Promise<{ ok: boolean; ml: number }> {
  const user = await getUser();
  if (!user) return { ok: false, ml: 0 };
  const supabase = await createClient();
  const date = today();

  const { data: cur } = await supabase
    .from("water_logs")
    .select("ml")
    .eq("user_id", user.id)
    .eq("log_date", date)
    .maybeSingle();

  const ml = Math.max(0, (cur?.ml ?? 0) + delta);
  const { error } = await supabase
    .from("water_logs")
    .upsert({ user_id: user.id, log_date: date, ml }, { onConflict: "user_id,log_date" });
  if (error) return { ok: false, ml: cur?.ml ?? 0 };

  revalidatePath("/dashboard");
  return { ok: true, ml };
}
