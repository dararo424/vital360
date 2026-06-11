"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { daysAgo, getUser, today } from "@/lib/dal";

/* eslint-disable @typescript-eslint/no-explicit-any */

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function genCode(): string {
  const arr = new Uint8Array(6);
  crypto.getRandomValues(arr);
  let s = "";
  for (const b of arr) s += CODE_CHARS[b % CODE_CHARS.length];
  return s;
}

export type GroupStatus =
  | { inGroup: false }
  | { inGroup: true; id: string; name: string; code: string; isOwner: boolean };

export type GroupMember = {
  name: string;
  isYou: boolean;
  streak: number;
  loggedToday: boolean;
  last7: boolean[];
};

/** Mi grupo actual (uno por usuario en este MVP). */
export async function getMyGroupStatus(): Promise<GroupStatus> {
  const user = await getUser();
  if (!user) return { inGroup: false };
  const supabase = await createClient();
  const { data: m } = await supabase
    .from("group_members")
    .select("group_id,groups(id,name,code,owner_id)")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();
  const g = (m as any)?.groups;
  if (!g) return { inGroup: false };
  return {
    inGroup: true,
    id: g.id,
    name: g.name,
    code: g.code,
    isOwner: g.owner_id === user.id,
  };
}

export async function createGroup(
  name: string
): Promise<{ ok: boolean; error?: string }> {
  const user = await getUser();
  if (!user) return { ok: false, error: "Sesión expirada." };
  const n = name.trim().slice(0, 60);
  if (!n) return { ok: false, error: "Ponle un nombre al grupo." };

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("group_members")
    .select("id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();
  if (existing) return { ok: false, error: "Ya estás en un grupo. Sal primero." };

  const { data: group, error } = await supabase
    .from("groups")
    .insert({ name: n, owner_id: user.id, code: genCode() })
    .select("id")
    .single();
  if (error || !group) return { ok: false, error: "No se pudo crear el grupo." };

  const { error: mErr } = await supabase
    .from("group_members")
    .insert({ group_id: group.id, user_id: user.id });
  if (mErr) {
    await supabase.from("groups").delete().eq("id", group.id);
    return { ok: false, error: "No se pudo crear el grupo." };
  }
  revalidatePath("/familia");
  return { ok: true };
}

export async function joinGroup(
  code: string
): Promise<{ ok: boolean; error?: string }> {
  const user = await getUser();
  if (!user) return { ok: false, error: "Sesión expirada." };
  const c = code.trim().toUpperCase();
  if (!c) return { ok: false, error: "Escribe el código." };

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("group_members")
    .select("id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();
  if (existing) return { ok: false, error: "Ya estás en un grupo. Sal primero." };

  // Buscar el grupo por código requiere saltar el RLS (aún no eres miembro).
  const admin = createAdminClient();
  const { data: group } = await admin
    .from("groups")
    .select("id")
    .eq("code", c)
    .maybeSingle();
  if (!group) return { ok: false, error: "Código no válido." };

  const { error } = await supabase
    .from("group_members")
    .insert({ group_id: group.id, user_id: user.id });
  if (error) return { ok: false, error: "No se pudo unir al grupo." };
  revalidatePath("/familia");
  return { ok: true };
}

/** Salir del grupo. Si eres el dueño, se elimina el grupo (cascade). */
export async function leaveGroup(): Promise<void> {
  const user = await getUser();
  if (!user) return;
  const supabase = await createClient();
  const { data: m } = await supabase
    .from("group_members")
    .select("group_id,groups(owner_id)")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();
  if (!m) return;
  const groupId = (m as any).group_id;
  const isOwner = (m as any).groups?.owner_id === user.id;
  if (isOwner) {
    await supabase.from("groups").delete().eq("id", groupId).eq("owner_id", user.id);
  } else {
    await supabase
      .from("group_members")
      .delete()
      .eq("group_id", groupId)
      .eq("user_id", user.id);
  }
  revalidatePath("/familia");
}

function computeStreak(dates: Set<string>, todayStr: string) {
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  let streak = 0;
  const d = new Date(todayStr + "T00:00:00Z");
  if (!dates.has(todayStr)) d.setUTCDate(d.getUTCDate() - 1);
  while (dates.has(fmt(d))) {
    streak++;
    d.setUTCDate(d.getUTCDate() - 1);
  }
  const last7: boolean[] = [];
  const t = new Date(todayStr + "T00:00:00Z");
  for (let i = 6; i >= 0; i--) {
    const x = new Date(t);
    x.setUTCDate(t.getUTCDate() - i);
    last7.push(dates.has(fmt(x)));
  }
  return { streak, loggedToday: dates.has(todayStr), last7 };
}

/** Tablero del grupo: rachas y constancia de cada miembro. */
export async function getGroupBoard(): Promise<GroupMember[]> {
  const user = await getUser();
  if (!user) return [];
  const supabase = await createClient();
  const { data: mine } = await supabase
    .from("group_members")
    .select("group_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();
  if (!mine) return [];
  const groupId = (mine as any).group_id;

  const admin = createAdminClient();
  const { data: members } = await admin
    .from("group_members")
    .select("user_id")
    .eq("group_id", groupId);
  const ids: string[] = ((members as any[]) ?? []).map((m) => m.user_id);
  if (ids.length === 0) return [];

  const [{ data: profiles }, { data: allLogs }] = await Promise.all([
    admin.from("profiles").select("id,full_name").in("id", ids),
    admin
      .from("food_logs")
      .select("user_id,log_date")
      .in("user_id", ids)
      .gte("log_date", daysAgo(30)),
  ]);

  const nameById = new Map<string, string>(
    ((profiles as any[]) ?? []).map((p) => [p.id, p.full_name ?? "Miembro"])
  );
  const datesByUser = new Map<string, Set<string>>();
  for (const id of ids) datesByUser.set(id, new Set());
  for (const l of (allLogs as any[]) ?? []) {
    datesByUser.get(l.user_id)?.add(String(l.log_date).slice(0, 10));
  }

  const todayStr = today();
  const board: GroupMember[] = ids.map((id) => {
    const s = computeStreak(datesByUser.get(id)!, todayStr);
    return {
      name: nameById.get(id) ?? "Miembro",
      isYou: id === user.id,
      streak: s.streak,
      loggedToday: s.loggedToday,
      last7: s.last7,
    };
  });
  board.sort((a, b) => b.streak - a.streak || (b.loggedToday ? 1 : 0) - (a.loggedToday ? 1 : 0));
  return board;
}
