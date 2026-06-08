import type { Metadata } from "next";
import Link from "next/link";
import { CalendarRange, ShoppingCart } from "lucide-react";
import { getLatestGroceryList, requireOnboarded } from "@/lib/dal";
import { Button } from "@/components/ui/button";
import { GroceryList } from "./grocery-list";

export const metadata: Metadata = { title: "Lista de mercado · Vital360" };

/* eslint-disable @typescript-eslint/no-explicit-any */
export default async function MercadoPage() {
  await requireOnboarded();
  const list = (await getLatestGroceryList()) as any;
  const items = list?.grocery_items ?? [];

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Lista de mercado</h1>
        {list && (
          <p className="text-sm text-muted-foreground">{list.title}</p>
        )}
      </header>

      {!list || items.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <div className="flex size-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <ShoppingCart className="size-7" />
          </div>
          <p className="max-w-xs text-sm text-muted-foreground">
            Aún no has generado una lista. Ve a tu plan semanal y pulsa “Lista”
            para juntar los ingredientes de tus recetas.
          </p>
          <Button asChild className="h-10">
            <Link href="/plan">
              <CalendarRange /> Ir al plan semanal
            </Link>
          </Button>
        </div>
      ) : (
        <GroceryList items={items} />
      )}
    </div>
  );
}
