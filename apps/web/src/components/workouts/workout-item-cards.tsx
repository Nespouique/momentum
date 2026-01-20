"use client";

import { GripVertical, Trash2, Repeat } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  WorkoutItemFormData,
  WorkoutItemExerciseFormData,
  formatExerciseSummary,
  formatRestTime,
} from "./types";

interface ExerciseItemCardProps {
  item: WorkoutItemFormData;
  onEdit: () => void;
  onDelete: () => void;
  dragHandleProps?: React.HTMLAttributes<HTMLButtonElement>;
}

export function ExerciseItemCard({ item, onEdit, onDelete, dragHandleProps }: ExerciseItemCardProps) {
  const exercise = item.exercises[0];
  if (!exercise) return null;

  return (
    <div
      className={cn(
        "rounded-lg border border-zinc-800 bg-zinc-900/50",
        "transition-all duration-200 hover:border-zinc-700"
      )}
    >
      <div className="flex items-center gap-2 p-3">
        {/* Drag handle */}
        <button
          type="button"
          className="shrink-0 p-1 -ml-1 cursor-grab active:cursor-grabbing touch-none"
          {...dragHandleProps}
        >
          <GripVertical className="h-4 w-4 text-zinc-500" />
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0 cursor-pointer" onClick={onEdit}>
          <p className="font-medium">{exercise.exercise.name}</p>
          <p className="text-sm text-muted-foreground">
            {formatExerciseSummary(exercise)}
            {exercise.restBetweenSets > 0 && ` · ${formatRestTime(exercise.restBetweenSets)}`}
          </p>
        </div>

        {/* Delete action */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onDelete}
          className="shrink-0 h-8 w-8 text-zinc-400 hover:text-red-400 hover:bg-red-500/10"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

interface SupersetItemCardProps {
  item: WorkoutItemFormData;
  onEdit: () => void;
  onDelete: () => void;
  onEditExercise: (exercise: WorkoutItemExerciseFormData) => void;
  dragHandleProps?: React.HTMLAttributes<HTMLButtonElement>;
}

export function SupersetItemCard({
  item,
  onEdit,
  onDelete,
  onEditExercise,
  dragHandleProps,
}: SupersetItemCardProps) {
  return (
    <div
      className={cn(
        "rounded-lg border border-zinc-800 bg-zinc-900/50",
        "transition-all duration-200 hover:border-zinc-700"
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-2 p-3 border-b border-zinc-800">
        {/* Drag handle */}
        <button
          type="button"
          className="shrink-0 p-1 -ml-1 cursor-grab active:cursor-grabbing touch-none"
          {...dragHandleProps}
        >
          <GripVertical className="h-4 w-4 text-zinc-500" />
        </button>

        {/* Badge and info */}
        <div className="flex items-center gap-2 flex-1 cursor-pointer" onClick={onEdit}>
          <span className="px-2 py-0.5 rounded text-xs font-semibold bg-purple-500/20 text-purple-300 flex items-center gap-1">
            <Repeat className="h-3 w-3" />
            Superset
          </span>
          <span className="text-sm text-muted-foreground">
            {item.rounds} série{item.rounds > 1 ? "s" : ""} · {formatRestTime(item.restBetweenRounds)}
          </span>
        </div>

        {/* Delete action */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onDelete}
          className="shrink-0 h-8 w-8 text-zinc-400 hover:text-red-400 hover:bg-red-500/10"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Exercises list */}
      <div className="divide-y divide-zinc-800">
        {item.exercises.map((exercise) => (
          <button
            key={exercise.id}
            onClick={() => onEditExercise(exercise)}
            className={cn(
              "w-full p-3 text-left",
              "transition-colors hover:bg-zinc-800/50"
            )}
          >
            <p className="font-medium">
              {exercise.exercise.name}
            </p>
            <p className="text-sm text-muted-foreground">
              {formatExerciseSummary(exercise)}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}
