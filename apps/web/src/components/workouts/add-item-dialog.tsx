"use client";

import { Dumbbell, Repeat } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface AddItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectExercise: () => void;
  onSelectSuperset: () => void;
}

export function AddItemDialog({
  open,
  onOpenChange,
  onSelectExercise,
  onSelectSuperset,
}: AddItemDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Ajouter à la séance</DialogTitle>
        </DialogHeader>

        <div className="grid gap-3 py-4">
          {/* Exercise option */}
          <button
            onClick={() => {
              onSelectExercise();
              onOpenChange(false);
            }}
            className={cn(
              "flex items-center gap-4 p-4 rounded-xl",
              "border border-zinc-800 bg-zinc-900/50",
              "transition-all duration-200",
              "hover:border-orange-500/50 hover:bg-orange-500/10",
              "text-left"
            )}
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-orange-500/20">
              <Dumbbell className="h-5 w-5 text-orange-400" />
            </div>
            <div>
              <h3 className="font-semibold">Exercice simple</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Un seul exercice avec plusieurs séries
              </p>
            </div>
          </button>

          {/* Superset option */}
          <button
            onClick={() => {
              onSelectSuperset();
              onOpenChange(false);
            }}
            className={cn(
              "flex items-center gap-4 p-4 rounded-xl",
              "border border-zinc-800 bg-zinc-900/50",
              "transition-all duration-200",
              "hover:border-purple-500/50 hover:bg-purple-500/10",
              "text-left"
            )}
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-purple-500/20">
              <Repeat className="h-5 w-5 text-purple-400" />
            </div>
            <div>
              <h3 className="font-semibold">Superset</h3>
              <p className="text-sm text-muted-foreground mt-1">
                2+ exercices enchaînés sans repos
              </p>
            </div>
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
