import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, Flame, Users } from "lucide-react";
import { requireOnboarded } from "@/lib/dal";
import { getGroupBoard, getMyGroupStatus } from "@/app/actions/group";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GroupForms } from "./group-forms";
import { CopyCode, LeaveButton } from "./group-actions";

export const metadata: Metadata = { title: "Familia · Vital360" };

export default async function FamiliaPage() {
  await requireOnboarded();
  const status = await getMyGroupStatus();

  return (
    <div className="space-y-5">
      <Link
        href="/dashboard"
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" /> Inicio
      </Link>
      <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
        <Users className="size-6 text-primary" /> Familia
      </h1>

      {!status.inGroup ? (
        <GroupForms />
      ) : (
        <GroupBoard
          name={status.name}
          code={status.code}
          isOwner={status.isOwner}
        />
      )}
    </div>
  );
}

async function GroupBoard({
  name,
  code,
  isOwner,
}: {
  name: string;
  code: string;
  isOwner: boolean;
}) {
  const board = await getGroupBoard();
  const loggedToday = board.filter((m) => m.loggedToday).length;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle className="text-base">{name}</CardTitle>
          <LeaveButton isOwner={isOwner} />
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between gap-2 rounded-lg bg-muted/40 p-3">
            <div className="text-sm">
              <p className="text-muted-foreground">Código para invitar</p>
            </div>
            <CopyCode code={code} />
          </div>
          <p className="text-sm">
            <strong>
              {loggedToday} de {board.length}
            </strong>{" "}
            {board.length === 1 ? "registró" : "registraron"} hoy. ¡Anímense! 💪
          </p>
        </CardContent>
      </Card>

      <div className="space-y-2">
        {board.map((m, i) => (
          <div
            key={i}
            className={cn(
              "flex items-center gap-3 rounded-xl border p-3",
              m.isYou && "border-primary/40 bg-primary/5"
            )}
          >
            <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold">
              {i + 1}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">
                {m.name}
                {m.isYou && <span className="text-muted-foreground"> (tú)</span>}
              </p>
              <div className="mt-1 flex gap-1">
                {m.last7.map((on, j) => (
                  <span
                    key={j}
                    className={cn(
                      "size-2 rounded-full",
                      on ? "bg-primary" : "bg-muted-foreground/25"
                    )}
                  />
                ))}
              </div>
            </div>
            <div className="shrink-0 text-right">
              <p className="flex items-center gap-1 font-semibold">
                <Flame className={cn("size-4", m.streak > 0 ? "text-orange-500" : "text-muted-foreground/40")} />
                {m.streak}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {m.loggedToday ? "hoy ✓" : "hoy —"}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
