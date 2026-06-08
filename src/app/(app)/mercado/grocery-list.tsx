"use client";

import { useState } from "react";
import { toggleGroceryItem } from "@/app/actions/plan";
import { cn } from "@/lib/utils";

type Item = {
  id: string;
  name: string;
  category: string | null;
  quantity: string | null;
  is_checked: boolean;
};

const ORDER = [
  "Verduras",
  "Frutas",
  "Carnes y huevos",
  "Lácteos",
  "Granos y legumbres",
  "Despensa",
  "Otros",
];

export function GroceryList({ items }: { items: Item[] }) {
  const [checked, setChecked] = useState<Record<string, boolean>>(
    Object.fromEntries(items.map((i) => [i.id, i.is_checked]))
  );

  function toggle(id: string) {
    const next = !checked[id];
    setChecked((p) => ({ ...p, [id]: next }));
    toggleGroceryItem(id, next); // optimista
  }

  const groups = new Map<string, Item[]>();
  for (const it of items) {
    const cat = it.category ?? "Otros";
    groups.set(cat, [...(groups.get(cat) ?? []), it]);
  }
  const cats = [...groups.keys()].sort(
    (a, b) => (ORDER.indexOf(a) + 1 || 99) - (ORDER.indexOf(b) + 1 || 99)
  );

  const done = items.filter((i) => checked[i.id]).length;

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">
        {done} de {items.length} marcados
      </p>
      {cats.map((cat) => (
        <div key={cat} className="space-y-1.5">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {cat}
          </h2>
          <ul className="divide-y rounded-lg border">
            {groups.get(cat)!.map((it) => (
              <li key={it.id}>
                <button
                  type="button"
                  onClick={() => toggle(it.id)}
                  className="flex w-full items-center gap-3 px-3 py-2.5 text-left"
                >
                  <span
                    className={cn(
                      "flex size-5 shrink-0 items-center justify-center rounded-md border",
                      checked[it.id]
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-input"
                    )}
                  >
                    {checked[it.id] && "✓"}
                  </span>
                  <span
                    className={cn(
                      "flex-1",
                      checked[it.id] && "text-muted-foreground line-through"
                    )}
                  >
                    {it.name}
                  </span>
                  <span className="shrink-0 text-sm text-muted-foreground">
                    {it.quantity}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
