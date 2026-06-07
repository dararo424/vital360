"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import type { ActionState } from "@/lib/types";

const credentialsSchema = z.object({
  email: z.email("Correo inválido").trim(),
  password: z.string().min(8, "Mínimo 8 caracteres"),
});

const signupSchema = credentialsSchema.extend({
  full_name: z.string().trim().min(1, "Tu nombre es requerido").max(80),
});

export async function login(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = credentialsSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return {
      ok: false,
      error: "Revisa los campos.",
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    return { ok: false, error: "Correo o contraseña incorrectos." };
  }

  redirect("/dashboard");
}

export async function signup(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = signupSchema.safeParse({
    full_name: formData.get("full_name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return {
      ok: false,
      error: "Revisa los campos.",
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
    };
  }

  const { full_name, email, password } = parsed.data;
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name } },
  });

  if (error) {
    return {
      ok: false,
      error:
        error.message === "User already registered"
          ? "Ese correo ya está registrado."
          : "No se pudo crear la cuenta. Intenta de nuevo.",
    };
  }

  // Supabase, con confirmación activada, devuelve un user con identities vacío
  // cuando el correo ya existe (sin lanzar error, para no filtrar usuarios).
  if (data.user && data.user.identities?.length === 0) {
    return { ok: false, error: "Ese correo ya está registrado." };
  }

  // Confirmación de email desactivada → hay sesión → directo al onboarding.
  if (data.session) {
    redirect("/onboarding");
  }

  // Confirmación activada → no hay sesión todavía: avisa que revise su correo.
  return { ok: true };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
