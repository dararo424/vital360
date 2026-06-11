"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Users } from "lucide-react";
import { createGroup, joinGroup } from "@/app/actions/group";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function GroupForms() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function create() {
    setError(null);
    start(async () => {
      const res = await createGroup(name);
      if (res.ok) router.refresh();
      else setError(res.error ?? "Error");
    });
  }
  function join() {
    setError(null);
    start(async () => {
      const res = await joinGroup(code);
      if (res.ok) router.refresh();
      else setError(res.error ?? "Error");
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col items-center gap-2 py-4 text-center">
        <div className="flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Users className="size-7" />
        </div>
        <p className="max-w-xs text-sm text-muted-foreground">
          Crea un grupo con tu familia o amigos y motívense viendo las rachas de
          cada uno. (No se comparte lo que comen, solo la constancia.)
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Crear un grupo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Label htmlFor="gname">Nombre</Label>
          <Input
            id="gname"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Familia Rodríguez"
          />
          <Button type="button" className="mt-1 h-10 w-full" onClick={create} disabled={pending || !name.trim()}>
            {pending ? <Loader2 className="animate-spin" /> : null} Crear grupo
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Unirme con un código</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Label htmlFor="gcode">Código</Label>
          <Input
            id="gcode"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="ABC123"
            className="font-mono tracking-widest"
          />
          <Button type="button" variant="outline" className="mt-1 h-10 w-full" onClick={join} disabled={pending || !code.trim()}>
            {pending ? <Loader2 className="animate-spin" /> : null} Unirme
          </Button>
        </CardContent>
      </Card>

      {error && <p className="text-center text-sm text-destructive">{error}</p>}
    </div>
  );
}
