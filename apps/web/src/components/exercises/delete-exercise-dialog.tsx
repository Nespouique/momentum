"use client";

import { ConfirmDeleteDialog } from "@/components/ui/confirm-delete-dialog";
import { Exercise } from "@/lib/api/exercises";

interface DeleteExerciseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exercise: Exercise | null;
  onConfirm: () => Promise<void>;
  isDeleting?: boolean;
}

export function DeleteExerciseDialog({
  open,
  onOpenChange,
  exercise,
  onConfirm,
  isDeleting = false,
}: DeleteExerciseDialogProps) {
  return (
    <ConfirmDeleteDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Supprimer l'exercice"
      description={
        <>
          Êtes-vous sûr de vouloir supprimer{" "}
          <span className="font-medium text-zinc-100">{exercise?.name}</span> ?
          <br />
          Cette action est irréversible.
        </>
      }
      onConfirm={onConfirm}
      isDeleting={isDeleting}
    />
  );
}
