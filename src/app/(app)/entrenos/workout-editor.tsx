"use client";

import { useRef, useState, useTransition } from "react";
import { Loader2, Plus, Search, Trash2, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { createExercise, logWorkout, updateWorkout } from "@/app/actions/workouts";
import { DecimalInput } from "@/components/ui/decimal-input";
import { RestTimer } from "./rest-timer";
import {
  EXERCISE_TYPES,
  EXERCISE_TYPE_LABELS,
  type Exercise,
  type ExerciseType,
} from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Row = { key: string; a: string; b: string; rpe: string };
type Block = {
  key: string;
  exercise_id: string;
  name: string;
  type: ExerciseType;
  rows: Row[];
  hint?: string | null;
};

function localToday(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

let kc = 0;
const k = () => `k${kc++}`;
const emptyRow = (): Row => ({ key: k(), a: "", b: "", rpe: "" });

export type WorkoutPrefill = {
  title: string;
  blocks: { exercise_id: string; name: string; type: ExerciseType; sets: number }[];
};

export type WorkoutEditInitial = {
  title: string;
  workout_date: string;
  duration_min: number | null;
  note: string | null;
  blocks: {
    exercise_id: string;
    name: string;
    type: string;
    rows: { a: string; b: string; rpe: string }[];
  }[];
};

export function WorkoutEditor({
  prefill,
  editId,
  initial,
}: {
  prefill?: WorkoutPrefill;
  editId?: string;
  initial?: WorkoutEditInitial;
}) {
  const [title, setTitle] = useState(initial?.title ?? prefill?.title ?? "");
  const [date, setDate] = useState(
    initial?.workout_date ? initial.workout_date.slice(0, 10) : localToday()
  );
  const [duration, setDuration] = useState(
    initial?.duration_min != null ? String(initial.duration_min) : ""
  );
  const [note, setNote] = useState(initial?.note ?? "");
  const [blocks, setBlocks] = useState<Block[]>(
    initial
      ? initial.blocks.map((b) => ({
          key: k(),
          exercise_id: b.exercise_id,
          name: b.name,
          type: b.type as ExerciseType,
          rows: (b.rows.length ? b.rows : [{ a: "", b: "", rpe: "" }]).map((r) => ({
            key: k(),
            a: r.a,
            b: r.b,
            rpe: r.rpe,
          })),
        }))
      : prefill
        ? prefill.blocks.map((b) => ({
            key: k(),
            exercise_id: b.exercise_id,
            name: b.name,
            type: b.type,
            rows: Array.from({ length: Math.max(1, b.sets) }, () => emptyRow()),
          }))
        : []
  );
  const [pickerOpen, setPickerOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, startSave] = useTransition();

  async function addExercise(ex: Exercise) {
    setPickerOpen(false);
    const blockKey = k();
    // Agrega el bloque ya (vacío) y luego precarga la última marca.
    setBlocks((p) => [
      ...p,
      { key: blockKey, exercise_id: ex.id, name: ex.name, type: ex.type, rows: [emptyRow()] },
    ]);

    try {
      const supabase = createClient();
      const { data } = await supabase
        .from("workout_sets")
        .select("reps,weight_kg,duration_sec,distance_m,workout_id,workouts(workout_date)")
        .eq("exercise_id", ex.id)
        .order("created_at", { ascending: false })
        .limit(15);
      if (!data || data.length === 0) return;

      /* eslint-disable @typescript-eslint/no-explicit-any */
      const latestWid = (data[0] as any).workout_id;
      const sets = (data as any[]).filter((s) => s.workout_id === latestWid).reverse();
      const date = (data[0] as any).workouts?.workout_date?.slice(0, 10) ?? "";
      /* eslint-enable @typescript-eslint/no-explicit-any */
      const rows: Row[] = sets.map((s) =>
        ex.type === "cardio"
          ? {
              key: k(),
              a: s.duration_sec ? String(Math.round(s.duration_sec / 60)) : "",
              b: s.distance_m ? String(s.distance_m / 1000) : "",
              rpe: "",
            }
          : {
              key: k(),
              a: s.reps != null ? String(s.reps) : "",
              b: s.weight_kg != null ? String(s.weight_kg) : "",
              rpe: "",
            }
      );
      const hint =
        "Última vez" +
        (date ? ` (${date})` : "") +
        ": " +
        sets
          .map((s) =>
            ex.type === "cardio"
              ? `${Math.round((s.duration_sec || 0) / 60)} min`
              : `${s.reps ?? "-"}×${s.weight_kg ?? 0}kg`
          )
          .join(", ");

      setBlocks((p) =>
        p.map((b) =>
          b.key === blockKey ? { ...b, rows: rows.length ? rows : b.rows, hint } : b
        )
      );
    } catch {
      /* sin historial */
    }
  }
  function addRow(bk: string) {
    setBlocks((p) =>
      p.map((b) => (b.key === bk ? { ...b, rows: [...b.rows, emptyRow()] } : b))
    );
  }
  function setRow(bk: string, rk: string, field: keyof Row, v: string) {
    setBlocks((p) =>
      p.map((b) =>
        b.key === bk
          ? { ...b, rows: b.rows.map((r) => (r.key === rk ? { ...r, [field]: v } : r)) }
          : b
      )
    );
  }
  function removeRow(bk: string, rk: string) {
    setBlocks((p) =>
      p.map((b) => (b.key === bk ? { ...b, rows: b.rows.filter((r) => r.key !== rk) } : b))
    );
  }
  function removeBlock(bk: string) {
    setBlocks((p) => p.filter((b) => b.key !== bk));
  }

  function save() {
    setError(null);
    if (!title.trim()) return setError("Ponle un título al entreno.");
    const sets = blocks.flatMap((b) => {
      let n = 0;
      return b.rows
        .filter((r) => r.a !== "" || r.b !== "")
        .map((r) => {
          n += 1;
          if (b.type === "fuerza") {
            return {
              exercise_id: b.exercise_id,
              set_number: n,
              reps: r.a ? Number(r.a) : null,
              weight_kg: r.b ? Number(r.b) : null,
              rpe: r.rpe ? Number(r.rpe) : null,
            };
          }
          return {
            exercise_id: b.exercise_id,
            set_number: n,
            duration_sec: r.a ? Math.round(Number(r.a) * 60) : null,
            distance_m: r.b ? Math.round(Number(r.b) * 1000) : null,
            rpe: r.rpe ? Number(r.rpe) : null,
          };
        });
    });
    if (sets.length === 0)
      return setError("Agrega al menos una serie con datos.");

    const payload = {
      title,
      workout_date: date,
      duration_min: duration ? Number(duration) : undefined,
      note,
      sets,
    };
    startSave(async () => {
      const res = editId
        ? await updateWorkout(editId, payload)
        : await logWorkout(payload);
      if (res && !res.ok) setError(res.error);
    });
  }

  return (
    <div className="space-y-5">
      <div className="space-y-1.5">
        <Label htmlFor="title">Título</Label>
        <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Empuje, Pierna, Cardio…" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="date">Fecha</Label>
          <Input id="date" type="date" value={date} max={localToday()} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="dur">Duración (min)</Label>
          <Input id="dur" type="number" inputMode="numeric" value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="60" />
        </div>
      </div>

      {/* Bloques de ejercicios */}
      <div className="space-y-3">
        {blocks.map((b) => (
          <div key={b.key} className="rounded-xl border p-3">
            <div className="mb-2 flex items-center justify-between">
              <div>
                <p className="font-medium">{b.name}</p>
                <p className="text-xs text-muted-foreground">{EXERCISE_TYPE_LABELS[b.type]}</p>
              </div>
              <button type="button" onClick={() => removeBlock(b.key)} aria-label="Quitar ejercicio" className="text-muted-foreground hover:text-destructive">
                <Trash2 className="size-4" />
              </button>
            </div>

            {b.hint && (
              <p className="mb-2 rounded-md bg-muted/50 px-2 py-1 text-[11px] text-muted-foreground">
                💪 {b.hint}
              </p>
            )}

            <div className="mb-1 grid grid-cols-[1.5rem_1fr_1fr_3rem_1.5rem] items-center gap-2 text-[11px] text-muted-foreground">
              <span>#</span>
              <span>{b.type === "fuerza" ? "Reps" : "Min"}</span>
              <span>{b.type === "fuerza" ? "Peso (kg)" : "Dist (km)"}</span>
              <span>RPE</span>
              <span />
            </div>
            <div className="space-y-1.5">
              {b.rows.map((r, i) => (
                <div key={r.key} className="grid grid-cols-[1.5rem_1fr_1fr_3rem_1.5rem] items-center gap-2">
                  <span className="text-sm text-muted-foreground">{i + 1}</span>
                  <DecimalInput value={r.a} onChange={(val) => setRow(b.key, r.key, "a", val)} className="h-8 px-2 text-center" />
                  <DecimalInput value={r.b} onChange={(val) => setRow(b.key, r.key, "b", val)} className="h-8 px-2 text-center" />
                  <DecimalInput value={r.rpe} onChange={(val) => setRow(b.key, r.key, "rpe", val)} className="h-8 px-1 text-center" />
                  <button type="button" onClick={() => removeRow(b.key, r.key)} aria-label="Quitar serie" className="text-muted-foreground hover:text-destructive">
                    <X className="size-4" />
                  </button>
                </div>
              ))}
            </div>
            <Button type="button" variant="ghost" size="sm" className="mt-2 h-8" onClick={() => addRow(b.key)}>
              <Plus /> Serie
            </Button>
          </div>
        ))}
      </div>

      <Button type="button" variant="outline" size="lg" className="h-11 w-full" onClick={() => setPickerOpen(true)}>
        <Plus /> Agregar ejercicio
      </Button>

      {blocks.length > 0 && <RestTimer />}

      <div className="space-y-1.5">
        <Label htmlFor="note">Nota (opcional)</Label>
        <Input id="note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Cómo te sentiste, PRs…" />
      </div>

      <div className="sticky bottom-[calc(5rem+env(safe-area-inset-bottom))] space-y-3 rounded-xl border bg-background/95 p-3 shadow-sm backdrop-blur">
        {error && (
          <p className="flex items-center gap-1.5 text-sm text-destructive"><X className="size-4" /> {error}</p>
        )}
        <Button type="button" size="lg" className="h-11 w-full" onClick={save} disabled={saving}>
          {saving ? "Guardando…" : "Guardar entreno"}
        </Button>
      </div>

      <ExercisePicker open={pickerOpen} onClose={() => setPickerOpen(false)} onPick={addExercise} />
    </div>
  );
}

function ExercisePicker({
  open,
  onClose,
  onPick,
}: {
  open: boolean;
  onClose: () => void;
  onPick: (ex: Exercise) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Exercise[]>([]);
  const [searching, setSearching] = useState(false);
  const [newType, setNewType] = useState<ExerciseType>("fuerza");
  const [muscle, setMuscle] = useState("");
  const [creating, startCreate] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const seq = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function onQueryChange(v: string) {
    setQuery(v);
    if (timer.current) clearTimeout(timer.current);
    const q = v.trim();
    if (q.length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    const id = ++seq.current;
    timer.current = setTimeout(async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("exercises")
        .select("*")
        .ilike("name", `%${q}%`)
        .order("name")
        .limit(10);
      if (id !== seq.current) return;
      setResults((data as Exercise[]) ?? []);
      setSearching(false);
    }, 300);
  }

  function create() {
    setError(null);
    if (!query.trim()) return setError("Escribe el nombre del ejercicio.");
    startCreate(async () => {
      const res = await createExercise({
        name: query.trim(),
        type: newType,
        muscle_group: muscle,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setQuery("");
      setResults([]);
      setMuscle("");
      onPick(res.exercise);
    });
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Agregar ejercicio</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={query} onChange={(e) => onQueryChange(e.target.value)} placeholder="Buscar o nombrar ejercicio…" className="pl-8" />
            {searching && <Loader2 className="absolute right-2.5 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />}
          </div>

          {query.trim().length >= 2 && results.length > 0 && (
            <ul className="max-h-48 space-y-1 overflow-auto">
              {results.map((ex) => (
                <li key={ex.id}>
                  <button type="button" onClick={() => onPick(ex)} className="flex w-full items-center justify-between rounded-md border px-2.5 py-2 text-left text-sm hover:bg-muted">
                    <span>{ex.name}{ex.muscle_group && <span className="text-muted-foreground"> · {ex.muscle_group}</span>}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">{EXERCISE_TYPE_LABELS[ex.type]}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="space-y-2 rounded-lg border bg-muted/30 p-3">
            <p className="text-xs font-medium text-muted-foreground">
              ¿No existe? Créalo con el nombre de arriba:
            </p>
            <div className="flex gap-2">
              <Select value={newType} onValueChange={(v) => setNewType(v as ExerciseType)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EXERCISE_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>{EXERCISE_TYPE_LABELS[t]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input value={muscle} onChange={(e) => setMuscle(e.target.value)} placeholder="Grupo muscular" className="h-8" />
            </div>
            <Button type="button" className="h-8 w-full" onClick={create} disabled={creating}>
              {creating ? <Loader2 className="animate-spin" /> : <Plus />} Crear y agregar
            </Button>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
      </DialogContent>
    </Dialog>
  );
}
