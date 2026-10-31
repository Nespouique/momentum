"use client";

import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { NumberInput } from "@/components/ui/number-input";
import { useAuthStore } from "@/stores/auth";
import { getExerciseLastPerformance } from "@/lib/api/exercises";
import type { AdHocExerciseConfig } from "@/lib/api/sessions";

const DEFAULT_SETS = 3;
const DEFAULT_REPS = 10;
const MAX_SETS = 10;
const MAX_REPS = 100;

interface AdHocExerciseConfigSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exercise: { id: string; name: string } | null;
  onConfirm: (exercise: { id: string; name: string }, config: AdHocExerciseConfig) => void;
  confirmLabel: string;
  isSubmitting?: boolean;
}

export function AdHocExerciseConfigSheet({
  open,
  onOpenChange,
  exercise,
  onConfirm,
  confirmLabel,
  isSubmitting = false,
}: AdHocExerciseConfigSheetProps) {
  const { token } = useAuthStore();
  const [sets, setSets] = useState<number | null>(DEFAULT_SETS);
  const [reps, setReps] = useState<number | null>(DEFAULT_REPS);
  const [hasHistory, setHasHistory] = useState(false);

  const exerciseId = exercise?.id;

  // Prefill from the latest completed performance when available.
  useEffect(() => {
    if (!open || !exerciseId) return;

    setSets(DEFAULT_SETS);
    setReps(DEFAULT_REPS);
    setHasHistory(false);
    if (!token) return;

    let cancelled = false;
    getExerciseLastPerformance(token, exerciseId)
      .then((response) => {
        const previousSets = response.data?.sets ?? [];
        if (cancelled || previousSets.length === 0) return;
        const lastReps = previousSets[previousSets.length - 1]?.actualReps;
        setSets(Math.min(previousSets.length, MAX_SETS));
        if (lastReps) setReps(Math.min(lastReps, MAX_REPS));
        setHasHistory(true);
      })
      .catch((error) => {
        console.error("Failed to load last performance:", error);
      });

    return () => {
      cancelled = true;
    };
  }, [open, exerciseId, token]);

  const isValid =
    sets !== null &&
    sets >= 1 &&
    sets <= MAX_SETS &&
    reps !== null &&
    reps >= 1 &&
    reps <= MAX_REPS;

  const handleConfirm = () => {
    if (!exercise || !isValid || sets === null || reps === null) return;
    onConfirm(exercise, { sets, reps });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="flex flex-col">
        <SheetHeader className="shrink-0">
          <SheetTitle>{exercise?.name ?? "Exercice"}</SheetTitle>
        </SheetHeader>

        <div className="space-y-5 px-1 py-4">
          <div className="flex items-center justify-between gap-4">
            <label className="text-sm font-medium">Nombre de séries</label>
            <NumberInput value={sets} onChange={setSets} min={1} max={MAX_SETS} className="w-32" />
          </div>
          <div className="flex items-center justify-between gap-4">
            <label className="text-sm font-medium">Reps par série</label>
            <NumberInput value={reps} onChange={setReps} min={1} max={MAX_REPS} className="w-32" />
          </div>
          <p className="text-xs text-muted-foreground">
            {hasHistory
              ? "Valeurs reprises de votre dernière performance. Le poids est repris automatiquement."
              : "Vous pourrez ajuster les reps et le poids de chaque série pendant l’exercice."}
          </p>
        </div>

        <div className="shrink-0 border-t border-zinc-800 pt-4">
          <Button onClick={handleConfirm} disabled={!isValid || isSubmitting} className="w-full">
            {confirmLabel}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
