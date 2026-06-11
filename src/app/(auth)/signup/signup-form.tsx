"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signup } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function SignupForm() {
  const [state, action, pending] = useActionState(signup, null);

  if (state?.ok) {
    return (
      <div className="space-y-3 text-center">
        <p className="text-sm">
          ¡Cuenta creada! Te enviamos un correo de confirmación. Ábrelo para
          activar tu cuenta y luego inicia sesión.
        </p>
        <Link
          href="/login"
          className="inline-block font-medium text-primary hover:underline"
        >
          Ir a iniciar sesión
        </Link>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="full_name">Nombre</Label>
        <Input
          id="full_name"
          name="full_name"
          autoComplete="name"
          placeholder="Tu nombre"
          required
        />
        {state && !state.ok && state.fieldErrors?.full_name && (
          <p className="text-sm text-destructive">
            {state.fieldErrors.full_name[0]}
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="email">Correo</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="tu@correo.com"
          required
        />
        {state && !state.ok && state.fieldErrors?.email && (
          <p className="text-sm text-destructive">
            {state.fieldErrors.email[0]}
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="password">Contraseña</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
        />
        <p className="text-xs text-muted-foreground">Mínimo 8 caracteres.</p>
        {state && !state.ok && state.fieldErrors?.password && (
          <p className="text-sm text-destructive">
            {state.fieldErrors.password[0]}
          </p>
        )}
      </div>

      <div className="space-y-1">
        <label htmlFor="accept" className="flex items-start gap-2 text-xs leading-snug text-muted-foreground">
          <input
            id="accept"
            name="accept"
            type="checkbox"
            className="mt-0.5 size-4 shrink-0 rounded border-input accent-primary"
          />
          <span>
            Acepto los{" "}
            <Link href="/legal" target="_blank" className="text-primary hover:underline">
              términos y la política de privacidad
            </Link>
            , incluido el tratamiento de mis datos de salud.
          </span>
        </label>
        {state && !state.ok && state.fieldErrors?.accept && (
          <p className="text-sm text-destructive">{state.fieldErrors.accept[0]}</p>
        )}
      </div>

      {state && !state.ok && !state.fieldErrors && (
        <p className="text-sm text-destructive">{state.error}</p>
      )}

      <Button type="submit" size="lg" className="h-11 w-full" disabled={pending}>
        {pending ? "Creando cuenta…" : "Crear cuenta"}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        ¿Ya tienes cuenta?{" "}
        <Link href="/login" className="font-medium text-primary hover:underline">
          Inicia sesión
        </Link>
      </p>
    </form>
  );
}
