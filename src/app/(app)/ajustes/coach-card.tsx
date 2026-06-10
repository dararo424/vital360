"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Check, Copy, Stethoscope, UserCheck } from "lucide-react";
import {
  createInviteCode,
  disconnectLink,
  type CoachStatus,
} from "@/app/actions/coach";
import { Button } from "@/components/ui/button";

export function CoachCard({ initial }: { initial: CoachStatus }) {
  const [status, setStatus] = useState<CoachStatus>(initial);
  const [busy, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  function generate() {
    setError(null);
    start(async () => {
      const res = await createInviteCode();
      if (res.ok) setStatus({ state: "pending", code: res.code, linkId: res.linkId });
      else setError(res.error);
    });
  }
  function disconnect() {
    const linkId = "linkId" in status ? status.linkId : null;
    if (!linkId) return;
    if (!confirm("¿Desconectar a tu nutricionista?")) return;
    start(async () => {
      await disconnectLink(linkId);
      setStatus({ state: "none" });
    });
  }
  function copy(code: string) {
    navigator.clipboard?.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="space-y-3">
      {status.state === "active" ? (
        <div className="flex items-center justify-between rounded-lg border bg-primary/5 p-3">
          <p className="flex items-center gap-2 text-sm">
            <UserCheck className="size-4 text-primary" />
            Conectado con <strong>{status.coachName}</strong>
          </p>
          <Button variant="ghost" size="sm" className="h-8" onClick={disconnect} disabled={busy}>
            Desconectar
          </Button>
        </div>
      ) : status.state === "pending" ? (
        <div className="space-y-2 rounded-lg border bg-muted/30 p-3">
          <p className="text-sm text-muted-foreground">
            Comparte este código con tu nutricionista para que se conecte:
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 rounded-md bg-background px-3 py-2 text-center text-lg font-bold tracking-widest">
              {status.code}
            </code>
            <Button variant="outline" size="icon" onClick={() => copy(status.code)} aria-label="Copiar">
              {copied ? <Check className="text-emerald-600" /> : <Copy />}
            </Button>
          </div>
          <Button variant="ghost" size="sm" className="h-8" onClick={disconnect} disabled={busy}>
            Cancelar código
          </Button>
        </div>
      ) : (
        <Button size="lg" className="h-11 w-full" onClick={generate} disabled={busy}>
          <Stethoscope /> Conectar mi nutricionista
        </Button>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}

      <Link
        href="/coach"
        className="block text-center text-xs text-muted-foreground hover:text-foreground"
      >
        ¿Eres nutricionista o coach? Entra a tu panel →
      </Link>
    </div>
  );
}
