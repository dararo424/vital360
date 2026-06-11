"use client";

import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import {
  Dumbbell,
  LayoutDashboard,
  LineChart,
  Loader2,
  PlusCircle,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/dashboard", label: "Inicio", icon: LayoutDashboard },
  { href: "/log", label: "Registrar", icon: PlusCircle },
  { href: "/recetas", label: "Recetas", icon: UtensilsCrossed },
  { href: "/entrenos", label: "Entrenos", icon: Dumbbell },
  { href: "/progreso", label: "Progreso", icon: LineChart },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <ul className="mx-auto flex max-w-md items-stretch justify-around">
        {ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className="flex flex-col items-center gap-1 py-1.5 text-[11px]"
              >
                <NavInner active={active} Icon={Icon} label={label} />
              </Link>
            </li>
          );
        })}
      </ul>
      {/* Respeta el safe-area inferior en iOS */}
      <div className="h-[env(safe-area-inset-bottom)]" />
    </nav>
  );
}

/** Contenido del ítem: muestra spinner mientras esa navegación está en curso. */
function NavInner({
  active,
  Icon,
  label,
}: {
  active: boolean;
  Icon: LucideIcon;
  label: string;
}) {
  const { pending } = useLinkStatus();
  const on = active || pending;
  return (
    <>
      <span
        className={cn(
          "flex items-center justify-center rounded-full px-4 py-1 transition-all",
          on ? "bg-primary/12 text-primary" : "text-muted-foreground"
        )}
      >
        {pending ? (
          <Loader2 className="size-5 animate-spin" />
        ) : (
          <Icon className={cn("size-5 transition-transform", active && "scale-110")} />
        )}
      </span>
      <span
        className={cn(
          "transition-colors",
          on ? "font-medium text-primary" : "text-muted-foreground"
        )}
      >
        {label}
      </span>
    </>
  );
}
