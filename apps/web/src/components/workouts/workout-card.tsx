"use client";

import { Play, Trash2, Copy, Dumbbell, CalendarClock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MuscleGroupBadge } from "@/components/exercises";
import { MuscleGroup } from "@/lib/constants/muscle-groups";
import { cn } from "@/lib/utils";
import { type Workout } from "@/lib/api/workouts";

export interface WorkoutCardProps {
  workout: Workout;
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate?: () => void;
  onStart?: () => void;
  startDisabled?: boolean;
  /** Variant: 'default' shows all buttons, 'history' hides Play and Copy */
  variant?: "default" | "history";
  /** Override exercise count (for history: completed exercises) */
  completedExerciseCount?: number;
  /** Override date display (for history: session date instead of lastCompletedAt) */
  sessionDate?: string | null;
  /** Override muscle groups (for history: from the original workout) */
  overrideMuscleGroups?: MuscleGroup[];
}

/**
 * Formats a date string to a relative format (Aujourd'hui, Hier, Il y a X jours, etc.)
 * Uses calendar days (not 24h periods) for comparison
 */
export function formatRelativeDate(dateStr: string | null): string | null {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  const now = new Date();

  // Compare calendar days by setting times to midnight
  const dateDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const nowDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffDays = Math.round((nowDay.getTime() - dateDay.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Aujourd'hui";
  if (diffDays === 1) return "Hier";
  if (diffDays < 7) return `Il y a ${diffDays} jours`;
  if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return `Il y a ${weeks} semaine${weeks > 1 ? "s" : ""}`;
  }
  // Format as date for older sessions
  return date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

export function WorkoutCard({
  workout,
  onEdit,
  onDelete,
  onDuplicate,
  onStart,
  startDisabled = false,
  variant = "default",
  completedExerciseCount,
  sessionDate,
  overrideMuscleGroups,
}: WorkoutCardProps) {
  const isHistoryVariant = variant === "history";

  // Count total exercises across all items (default behavior)
  const calculatedExerciseCount = workout.items.reduce((acc, item) => {
    return acc + item.exercises.length;
  }, 0);

  // Use completedExerciseCount if provided, otherwise use calculated count
  const exerciseCount = completedExerciseCount ?? calculatedExerciseCount;

  // Extract muscle groups sorted by frequency (most used first)
  // Use overrideMuscleGroups if provided (for history variant)
  let muscleGroups: MuscleGroup[];
  if (overrideMuscleGroups) {
    muscleGroups = overrideMuscleGroups;
  } else {
    const allMuscleGroups = workout.items.flatMap((item) =>
      item.exercises.flatMap((ex) => ex.exercise.muscleGroups)
    );
    const muscleGroupCounts = allMuscleGroups.reduce(
      (acc, group) => {
        acc[group] = (acc[group] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );
    muscleGroups = Object.entries(muscleGroupCounts)
      .sort((a, b) => b[1] - a[1]) // Sort by count descending
      .map(([group]) => group as MuscleGroup);
  }

  // Format date - use sessionDate for history variant, lastCompletedAt for default
  const dateToDisplay = isHistoryVariant ? (sessionDate ?? null) : workout.lastCompletedAt;
  const formattedDate = formatRelativeDate(dateToDisplay);

  // Show max 4 muscle groups, then "+X"
  const visibleGroups = muscleGroups.slice(0, 4);
  const hiddenCount = muscleGroups.length - 4;

  return (
    <div
      onClick={onEdit}
      className={cn(
        "group relative rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-4 cursor-pointer",
        "transition-all duration-200 hover:border-zinc-700 hover:bg-zinc-900/70"
      )}
    >
      {/* Header: Name + Actions */}
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-semibold text-zinc-100 truncate text-base flex-1 min-w-0">
          {workout.name}
        </h3>

        {/* Action buttons */}
        <div className="flex items-center gap-1 shrink-0">
          {/* Play button - only in default variant */}
          {!isHistoryVariant && onStart && (
            <Button
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                onStart();
              }}
              disabled={startDisabled}
              className="h-8 w-8"
              title="Démarrer la séance"
            >
              <Play className="h-4 w-4" />
              <span className="sr-only">Démarrer</span>
            </Button>
          )}

          {/* Copy button - only in default variant */}
          {!isHistoryVariant && onDuplicate && (
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                onDuplicate();
              }}
              className="h-8 w-8 text-zinc-400 hover:text-zinc-100"
              title="Dupliquer la séance"
            >
              <Copy className="h-4 w-4" />
              <span className="sr-only">Dupliquer</span>
            </Button>
          )}

          {/* Delete button - visible in both variants */}
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="h-8 w-8 text-red-500 hover:text-red-400 hover:bg-red-500/10"
            title="Supprimer la séance"
          >
            <Trash2 className="h-4 w-4" />
            <span className="sr-only">Supprimer</span>
          </Button>
        </div>
      </div>

      {/* Separator */}
      <div className="h-px bg-linear-to-r from-primary/30 to-transparent my-3" />

      {/* Stats row */}
      <div className="flex items-center gap-2 text-xs text-zinc-500">
        <span className="flex items-center gap-1.5">
          <Dumbbell className="h-3.5 w-3.5" />
          {exerciseCount} exercice{exerciseCount > 1 ? "s" : ""}
        </span>
        <span className="text-zinc-700">·</span>
        <span className="flex items-center gap-1.5">
          <CalendarClock className="h-3.5 w-3.5" />
          {formattedDate ?? "Jamais réalisée"}
        </span>
      </div>

      {/* Muscle groups */}
      {muscleGroups.length > 0 && (
        <div className="flex items-center gap-1.5 mt-3 flex-wrap">
          {visibleGroups.map((group) => (
            <MuscleGroupBadge key={group} group={group} size="sm" />
          ))}
          {hiddenCount > 0 && (
            <span className="text-[10px] text-zinc-500 bg-zinc-800/50 px-1.5 py-0.5 rounded">
              +{hiddenCount}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
