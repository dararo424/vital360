"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Link2, X } from "lucide-react";
import { redeemInviteCode } from "@/app/actions/coach";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function RedeemForm() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [busy, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  function connect() {
    setMsg(null);
    start(async () => {
      const res = await redeemInviteCode(code);
      if (res.ok) {
        setMsg({ ok: true, text: `Conectado con ${res.clientName} ✓` });
        setCode("");
        router.refresh();
      } else setMsg({ ok: false, text: res.error });
    });
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="Código del cliente"
          className="tracking-widest"
          onKeyDown={(e) => e.key === "Enter" && connect()}
        />
        <Button type="button" className="shrink-0" onClick={connect} disabled={busy}>
          <Link2 /> Conectar
        </Button>
      </div>
      {msg && (
        <p className={`flex items-center gap-1.5 text-sm ${msg.ok ? "text-emerald-600" : "text-destructive"}`}>
          {msg.ok ? <Check className="size-4" /> : <X className="size-4" />} {msg.text}
        </p>
      )}
    </div>
  );
}
