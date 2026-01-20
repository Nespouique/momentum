"use client";

import { Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Exercise } from "@/lib/api/exercises";
import { MuscleGroupBadge } from "./muscle-group-badge";
import { MuscleGroup } from "@/lib/constants/muscle-groups";

interface ExerciseCardProps {
  exercise: Exercise;
  onEdit?: () => void;
  onDelete?: () => void;
}

export function ExerciseCard({ exercise, onEdit, onDelete }: ExerciseCardProps) {
  return (
    <div
      onClick={onEdit}
      className={cn(
        "rounded-lg border border-zinc-800 bg-zinc-900/50 p-4 cursor-pointer",
        "transition-all duration-200 hover:border-zinc-700 hover:bg-zinc-900"
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex-1 min-w-0">
          {/* Name */}
          <h3 className="font-semibold text-zinc-100 truncate">
            {exercise.name}
          </h3>

          {/* Muscle group badges */}
          <div className="flex flex-wrap gap-1.5 mt-2.5">
            {[...exercise.muscleGroups].sort((a, b) => a.localeCompare(b, "fr")).map((group) => (
              <MuscleGroupBadge
                key={group}
                group={group as MuscleGroup}
                size="sm"
              />
            ))}
          </div>
        </div>

        {/* Delete button */}
        <div className="flex items-center shrink-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              onDelete?.();
            }}
            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/20"
          >
            <Trash2 className="h-4 w-4" />
            <span className="sr-only">Supprimer</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
