import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Stethoscope, Users } from "lucide-react";
import { requireOnboarded } from "@/lib/dal";
import { getMyClients } from "@/app/actions/coach";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RedeemForm } from "./redeem-form";

export const metadata: Metadata = { title: "Panel del coach · Vital360" };

export default async function CoachPage() {
  await requireOnboarded();
  const clients = await getMyClients();

  return (
    <div className="space-y-5">
      <Link
        href="/ajustes"
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" /> Ajustes
      </Link>
      <header>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <Stethoscope className="size-6 text-primary" /> Panel del coach
        </h1>
        <p className="text-sm text-muted-foreground">
          Conecta a tus clientes y ajústales sus metas.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Conectar un cliente</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-3 text-sm text-muted-foreground">
            Pídele a tu cliente su código (Ajustes → Tu nutricionista) e
            ingrésalo aquí.
          </p>
          <RedeemForm />
        </CardContent>
      </Card>

      <div className="space-y-2">
        <h2 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Users className="size-4" /> Tus clientes ({clients.length})
        </h2>
        {clients.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Aún no tienes clientes conectados.
          </p>
        ) : (
          <ul className="space-y-2">
            {clients.map((c) => (
              <li key={c.linkId}>
                <Link href={`/coach/${c.clientId}`}>
                  <Card className="transition-colors hover:bg-muted/40">
                    <CardContent className="flex items-center justify-between py-4">
                      <span className="font-medium">{c.clientName}</span>
                      <ChevronRight className="size-4 text-muted-foreground" />
                    </CardContent>
                  </Card>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
