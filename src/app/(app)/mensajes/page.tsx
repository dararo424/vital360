import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, MessageCircle } from "lucide-react";
import { requireOnboarded } from "@/lib/dal";
import { getClientThread } from "@/app/actions/coach";
import { Card, CardContent } from "@/components/ui/card";
import { NotesThread } from "@/components/notes-thread";

export const metadata: Metadata = { title: "Mensajes · Vital360" };

export default async function MensajesPage() {
  await requireOnboarded();
  const thread = await getClientThread();

  return (
    <div className="space-y-4">
      <Link
        href="/ajustes"
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" /> Ajustes
      </Link>
      <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
        <MessageCircle className="size-6 text-primary" /> Mensajes
      </h1>

      {!thread ? (
        <div className="py-16 text-center text-sm text-muted-foreground">
          No tienes un nutricionista conectado. Conéctalo en Ajustes para
          escribirse.
        </div>
      ) : (
        <Card>
          <CardContent className="py-4">
            <p className="mb-3 text-sm text-muted-foreground">
              Conversación con <strong>{thread.coachName}</strong>
            </p>
            <NotesThread notes={thread.notes} variant="client" />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
