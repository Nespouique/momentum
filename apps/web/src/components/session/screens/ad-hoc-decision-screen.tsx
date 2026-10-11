"use client";

import { Check, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AdHocDecisionScreenProps {
  completedExerciseName: string;
  onAddExercise: () => void;
  onFinish: () => void;
  isSubmitting?: boolean;
}

export function AdHocDecisionScreen({
  completedExerciseName,
  onAddExercise,
  onFinish,
  isSubmitting = false,
}: AdHocDecisionScreenProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-8 text-center">
      <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Check className="h-7 w-7" />
      </div>
      <h2 className="text-xl font-semibold">Exercice terminé</h2>
      <p className="mt-2 text-sm text-muted-foreground">{completedExerciseName}</p>
      <p className="mt-6 max-w-sm text-sm text-muted-foreground">
        Continuez votre séance avec un autre exercice ou passez au récapitulatif.
      </p>

      <div className="mt-8 flex w-full max-w-sm flex-col gap-3">
        <Button size="lg" onClick={onAddExercise} disabled={isSubmitting} className="gap-2">
          <Plus className="h-5 w-5" />
          Ajouter un exercice
        </Button>
        <Button size="lg" variant="outline" onClick={onFinish} disabled={isSubmitting}>
          Finir la séance
        </Button>
      </div>
    </div>
  );
}
