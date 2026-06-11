"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, LogOut } from "lucide-react";
import { leaveGroup } from "@/app/actions/group";
import { Button } from "@/components/ui/button";

export function CopyCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard?.writeText(code).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        });
      }}
      className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 font-mono text-lg font-semibold tracking-widest transition-colors hover:bg-muted"
    >
      {code}
      {copied ? <Check className="size-4 text-emerald-600" /> : <Copy className="size-4 text-muted-foreground" />}
    </button>
  );
}

export function LeaveButton({ isOwner }: { isOwner: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="h-9 text-muted-foreground"
      disabled={pending}
      onClick={() => {
        const msg = isOwner
          ? "Eres el dueño: salir eliminará el grupo para todos. ¿Continuar?"
          : "¿Salir del grupo?";
        if (confirm(msg))
          start(async () => {
            await leaveGroup();
            router.refresh();
          });
      }}
    >
      <LogOut /> {isOwner ? "Eliminar grupo" : "Salir"}
    </Button>
  );
}
