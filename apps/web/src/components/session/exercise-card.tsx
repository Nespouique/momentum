"use client";

import { forwardRef } from "react";
import { GripVertical } from "lucide-react";
import type { DraggableAttributes } from "@dnd-kit/core";
import type { SyntheticListenerMap } from "@dnd-kit/core/dist/hooks/utilities";
import { MuscleGroupBadge } from "@/components/exercises";
import { MuscleGroup } from "@/lib/constants/muscle-groups";
import { cn } from "@/lib/utils";

// Shared exercise data interface
export interface ExerciseItemData {
  name: string;
  muscleGroups: string[];
  firstSetTarget?: { reps: number; weight: number | null };
  lastFirstSet?: { reps: number | null; weight: number | null } | null;
}

// Drag handle props from dnd-kit useSortable
export interface DragHandleProps {
  attributes: DraggableAttributes;
  listeners: SyntheticListenerMap | undefined;
}

// Base props shared by all variants
interface BaseProps {
  totalSets: number;
  className?: string;
}

// Standard exercise props
interface StandardExerciseProps extends BaseProps {
  type: "standard";
  exercise: ExerciseItemData;
}

// Superset props
interface SupersetProps extends BaseProps {
  type: "superset";
  exercises: ExerciseItemData[];
}

// Draggable variant specific props
interface DraggableVariantProps {
  variant: "draggable";
  dragHandleProps: DragHandleProps;
  isDragging?: boolean;
}

// Non-draggable variants props
interface NonDraggableVariantProps {
  variant: "next" | "minimal";
  dragHandleProps?: never;
  isDragging?: never;
}

// Props for the unified ExerciseCard component
export type ExerciseCardProps =
  | (StandardExerciseProps & NonDraggableVariantProps)
  | (StandardExerciseProps & DraggableVariantProps)
  | (SupersetProps & NonDraggableVariantProps)
  | (SupersetProps & DraggableVariantProps);

export const ExerciseCard = forwardRef<HTMLDivElement, ExerciseCardProps>(
  function ExerciseCard(props, ref) {
    const { variant, type, totalSets, className, isDragging = false } = props;
    const isSuperset = type === "superset";
    const showTargets = variant === "next";
    const isDraggable = variant === "draggable";

    // Determine header text based on variant and type
    const getHeaderText = () => {
      if (variant === "next") {
        return "Prochain exercice";
      }
      return isSuperset ? "Superset" : "Standard";
    };

    // Determine suffix text (superset indicator + sets count)
    const getSuffixText = () => {
      const setsText = `${totalSets} série${totalSets > 1 ? "s" : ""}`;
      if (variant === "next" && isSuperset) {
        return `· Superset · ${setsText}`;
      }
      return `· ${setsText}`;
    };

    // Get exercises array (works for both standard and superset)
    const exercises: ExerciseItemData[] =
      type === "superset" ? props.exercises : [props.exercise];

    return (
      <div
        ref={ref}
        className={cn(
          "rounded-xl overflow-hidden",
          isSuperset
            ? "border border-purple-500/30 bg-purple-500/5"
            : "border border-zinc-800 bg-zinc-900/30",
          isDragging && "opacity-50",
          className
        )}
      >
        {/* Header */}
        <div
          className={cn(
            "flex items-center gap-2 px-4 py-2.5 border-b",
            isSuperset
              ? "bg-purple-500/10 border-purple-500/20"
              : "bg-zinc-800/50 border-zinc-700/50"
          )}
        >
          {/* Drag handle (only for draggable variant) */}
          {isDraggable && props.dragHandleProps && (
            <button
              type="button"
              className={cn(
                "shrink-0 p-1 -ml-1 cursor-grab active:cursor-grabbing touch-none",
                isSuperset ? "text-purple-400" : "text-zinc-500"
              )}
              {...props.dragHandleProps.attributes}
              {...props.dragHandleProps.listeners}
            >
              <GripVertical className="h-4 w-4" />
            </button>
          )}

          <span
            className={cn(
              "text-xs font-semibold tracking-widest uppercase",
              isSuperset ? "text-purple-300" : "text-zinc-400"
            )}
          >
            {getHeaderText()}
          </span>
          <span
            className={cn(
              "text-xs",
              isSuperset ? "text-purple-400/70" : "text-zinc-500"
            )}
          >
            {getSuffixText()}
          </span>
        </div>

        {/* Exercise(s) content */}
        <div className={cn("p-4", exercises.length > 1 ? "space-y-4" : "space-y-2")}>
          {exercises.map((exercise, idx) => (
            <ExerciseItemContent
              key={idx}
              exercise={exercise}
              showTargets={showTargets}
              isInSuperset={exercises.length > 1}
            />
          ))}
        </div>
      </div>
    );
  }
);

interface ExerciseItemContentProps {
  exercise: ExerciseItemData;
  showTargets: boolean;
  isInSuperset: boolean;
}

function ExerciseItemContent({
  exercise,
  showTargets,
  isInSuperset,
}: ExerciseItemContentProps) {
  return (
    <div className={cn(isInSuperset ? "space-y-2" : "space-y-2")}>
      {/* Exercise name */}
      <h4 className="font-semibold text-zinc-100 truncate">{exercise.name}</h4>

      {/* Muscle group badges */}
      <div className="flex flex-wrap gap-1">
        {[...exercise.muscleGroups]
          .sort((a, b) => a.localeCompare(b, "fr"))
          .slice(0, 3)
          .map((group) => (
            <MuscleGroupBadge key={group} group={group as MuscleGroup} size="sm" />
          ))}
      </div>

      {/* Target and last time (only for "next" variant) */}
      {showTargets && exercise.firstSetTarget && (
        <div className="flex items-center gap-2 text-sm">
          <span className="text-zinc-400">
            {exercise.firstSetTarget.reps} reps @ {exercise.firstSetTarget.weight ?? 0}kg
          </span>
          {exercise.lastFirstSet && exercise.lastFirstSet.reps !== null && (
            <>
              <span className="text-zinc-600">·</span>
              <span className="text-zinc-500">
                Dernière : {exercise.lastFirstSet.reps}
                {exercise.lastFirstSet.weight !== null &&
                  ` @ ${exercise.lastFirstSet.weight}kg`}
              </span>
            </>
          )}
        </div>
      )}
    </div>
  );
}
