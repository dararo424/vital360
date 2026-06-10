"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUser, today } from "@/lib/dal";
import type { Macros } from "@/lib/types";

/* eslint-disable @typescript-eslint/no-explicit-any */

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function genCode(): string {
  const arr = new Uint8Array(8);
  crypto.getRandomValues(arr);
  let s = "";
  for (const b of arr) s += CODE_CHARS[b % CODE_CHARS.length];
  return s;
}

async function myName(supabase: any, userId: string): Promise<string> {
  const { data } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", userId)
    .maybeSingle();
  return data?.full_name ?? "Usuario";
}

// ── Lado cliente ─────────────────────────────────────────────────────────────

export type CoachStatus =
  | { state: "none" }
  | { state: "pending"; code: string; linkId: string }
  | { state: "active"; coachName: string; linkId: string };

export async function getCoachStatus(): Promise<CoachStatus> {
  const user = await getUser();
  if (!user) return { state: "none" };
  const supabase = await createClient();
  const { data } = await supabase
    .from("coach_links")
    .select("id,code,status,coach_name")
    .eq("client_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data) return { state: "none" };
  if (data.status === "active")
    return { state: "active", coachName: data.coach_name ?? "Tu coach", linkId: data.id };
  return { state: "pending", code: data.code, linkId: data.id };
}

export async function createInviteCode(): Promise<
  { ok: true; code: string; linkId: string } | { ok: false; error: string }
> {
  const user = await getUser();
  if (!user) return { ok: false, error: "Sesión expirada." };
  const supabase = await createClient();

  const existing = await getCoachStatus();
  if (existing.state === "pending")
    return { ok: true, code: existing.code, linkId: existing.linkId };
  if (existing.state === "active")
    return { ok: false, error: "Ya tienes un coach conectado." };

  const code = genCode();
  const { data, error } = await supabase
    .from("coach_links")
    .insert({
      client_id: user.id,
      code,
      status: "pending",
      client_name: await myName(supabase, user.id),
    })
    .select("id")
    .single();
  if (error || !data) return { ok: false, error: "No se pudo crear el código." };
  revalidatePath("/ajustes");
  return { ok: true, code, linkId: data.id };
}

export async function disconnectLink(linkId: string): Promise<void> {
  const user = await getUser();
  if (!user) return;
  const supabase = await createClient();
  // RLS permite borrar si eres el cliente o el coach del vínculo.
  await supabase.from("coach_links").delete().eq("id", linkId);
  revalidatePath("/ajustes");
  revalidatePath("/coach");
}

// ── Lado coach ───────────────────────────────────────────────────────────────

export async function redeemInviteCode(
  code: string
): Promise<{ ok: true; clientName: string } | { ok: false; error: string }> {
  const user = await getUser();
  if (!user) return { ok: false, error: "Sesión expirada." };
  const clean = code.trim().toUpperCase();
  if (clean.length < 4) return { ok: false, error: "Código inválido." };

  const admin = createAdminClient();
  const { data: link } = await admin
    .from("coach_links")
    .select("*")
    .eq("code", clean)
    .eq("status", "pending")
    .maybeSingle();
  if (!link) return { ok: false, error: "Código no válido o ya usado." };
  if (link.client_id === user.id)
    return { ok: false, error: "No puedes conectarte contigo mismo." };

  const supabase = await createClient();
  const { error } = await admin
    .from("coach_links")
    .update({
      coach_id: user.id,
      coach_name: await myName(supabase, user.id),
      status: "active",
    })
    .eq("id", link.id);
  if (error) return { ok: false, error: "No se pudo conectar." };

  revalidatePath("/coach");
  return { ok: true, clientName: link.client_name ?? "Tu cliente" };
}

export type CoachClient = { linkId: string; clientId: string; clientName: string };

export async function getMyClients(): Promise<CoachClient[]> {
  const user = await getUser();
  if (!user) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("coach_links")
    .select("id,client_id,client_name")
    .eq("coach_id", user.id)
    .eq("status", "active")
    .order("created_at", { ascending: false });
  return ((data as any[]) ?? []).map((l) => ({
    linkId: l.id,
    clientId: l.client_id,
    clientName: l.client_name ?? "Cliente",
  }));
}

/** Verifica que el usuario actual es coach activo del cliente dado. */
async function assertCoachOf(clientId: string): Promise<string | null> {
  const user = await getUser();
  if (!user) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("coach_links")
    .select("id")
    .eq("coach_id", user.id)
    .eq("client_id", clientId)
    .eq("status", "active")
    .maybeSingle();
  return data ? user.id : null;
}

export type ClientSummary = {
  name: string;
  objective: string | null;
  target_weight_kg: number | null;
  currentWeight: number | null;
  deltaWeight: number | null;
  goal: Macros | null;
  todayKcal: number | null;
  streak: number;
};

export async function getClientSummary(
  clientId: string
): Promise<ClientSummary | null> {
  const coach = await assertCoachOf(clientId);
  if (!coach) return null;
  const admin = createAdminClient();
  const todayStr = today();

  const [{ data: profile }, { data: weights }, { data: goalRow }, { data: vd }, { data: logs }] =
    await Promise.all([
      admin.from("profiles").select("full_name,objective,target_weight_kg").eq("id", clientId).maybeSingle(),
      admin.from("body_metrics").select("weight_kg,measured_at").eq("user_id", clientId).not("weight_kg", "is", null).order("measured_at", { ascending: true }),
      admin.from("nutrition_goals").select("kcal_target,protein_g,carbs_g,fat_g").eq("user_id", clientId).is("effective_to", null).order("effective_from", { ascending: false }).limit(1).maybeSingle(),
      admin.from("v_daily_macros").select("kcal").eq("user_id", clientId).eq("log_date", todayStr).maybeSingle(),
      admin.from("food_logs").select("log_date").eq("user_id", clientId).order("log_date", { ascending: false }).limit(120),
    ]);

  const w = (weights as any[]) ?? [];
  const currentWeight = w.length ? w[w.length - 1].weight_kg : null;
  const deltaWeight = w.length > 1 ? Math.round((currentWeight - w[0].weight_kg) * 10) / 10 : null;

  // racha simple
  const set = new Set(((logs as any[]) ?? []).map((r) => String(r.log_date).slice(0, 10)));
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  let streak = 0;
  const d = new Date(todayStr + "T00:00:00Z");
  if (!set.has(todayStr)) d.setUTCDate(d.getUTCDate() - 1);
  while (set.has(fmt(d))) {
    streak++;
    d.setUTCDate(d.getUTCDate() - 1);
  }

  return {
    name: (profile as any)?.full_name ?? "Cliente",
    objective: (profile as any)?.objective ?? null,
    target_weight_kg: (profile as any)?.target_weight_kg ?? null,
    currentWeight,
    deltaWeight,
    goal: goalRow
      ? {
          kcal: (goalRow as any).kcal_target,
          protein_g: (goalRow as any).protein_g,
          carbs_g: (goalRow as any).carbs_g,
          fat_g: (goalRow as any).fat_g,
        }
      : null,
    todayKcal: (vd as any)?.kcal ?? null,
    streak,
  };
}

const goalSchema = z.object({
  kcal_target: z.coerce.number().int().min(800).max(8000),
  protein_g: z.coerce.number().min(0).max(1000),
  carbs_g: z.coerce.number().min(0).max(1500),
  fat_g: z.coerce.number().min(0).max(800),
});

export async function setClientGoal(
  clientId: string,
  input: z.input<typeof goalSchema>
): Promise<{ ok: boolean; error?: string }> {
  const coach = await assertCoachOf(clientId);
  if (!coach) return { ok: false, error: "No autorizado." };
  const parsed = goalSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues.map((i) => i.message).join(" · ") };

  const admin = createAdminClient();
  const todayStr = today();
  await admin
    .from("nutrition_goals")
    .update({ effective_to: todayStr })
    .eq("user_id", clientId)
    .is("effective_to", null);
  const { error } = await admin.from("nutrition_goals").insert({
    user_id: clientId,
    ...parsed.data,
    effective_from: todayStr,
    effective_to: null,
  });
  if (error) return { ok: false, error: "No se pudo fijar la meta." };
  // Metas del nutri → desactiva el modo adaptable para no pisarlas.
  await admin.from("profiles").update({ adaptive: false }).eq("id", clientId);

  revalidatePath(`/coach/${clientId}`);
  return { ok: true };
}
