"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Send } from "lucide-react";
import { addClientNote, addCoachNote, type Note } from "@/app/actions/coach";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function NotesThread({
  notes,
  variant,
  clientId,
}: {
  notes: Note[];
  variant: "coach" | "client";
  clientId?: string;
}) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [busy, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function send() {
    const text = body.trim();
    if (!text) return;
    setError(null);
    start(async () => {
      const res =
        variant === "coach"
          ? await addCoachNote(clientId!, text)
          : await addClientNote(text);
      if (res.ok) {
        setBody("");
        router.refresh();
      } else setError(res.error ?? "Error");
    });
  }

  return (
    <div className="space-y-3">
      {notes.length === 0 ? (
        <p className="py-4 text-center text-sm text-muted-foreground">
          Sin mensajes todavía. Escribe el primero.
        </p>
      ) : (
        <ul className="max-h-72 space-y-2 overflow-auto">
          {notes.map((n) => (
            <li
              key={n.id}
              className={cn("flex", n.mine ? "justify-end" : "justify-start")}
            >
              <div
                className={cn(
                  "max-w-[80%] rounded-2xl px-3 py-2 text-sm",
                  n.mine
                    ? "rounded-br-sm bg-primary text-primary-foreground"
                    : "rounded-bl-sm bg-muted"
                )}
              >
                <p className="whitespace-pre-wrap">{n.body}</p>
                <p
                  className={cn(
                    "mt-0.5 text-[10px]",
                    n.mine ? "text-primary-foreground/70" : "text-muted-foreground"
                  )}
                >
                  {new Date(n.created_at).toLocaleString("es", {
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="flex gap-2">
        <Input
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Escribe un mensaje…"
          onKeyDown={(e) => e.key === "Enter" && send()}
        />
        <Button type="button" size="icon" className="shrink-0" onClick={send} disabled={busy}>
          <Send />
        </Button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
