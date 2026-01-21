"use client";

import { GripVertical, Trash2, Repeat } from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { restrictToParentElement, restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { CSS } from "@dnd-kit/utilities";
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
          className="shrink-0 h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/20"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// Sortable exercise item within a superset
interface SortableExerciseInSupersetProps {
  exercise: WorkoutItemExerciseFormData;
  onEdit: () => void;
}

function SortableExerciseInSuperset({ exercise, onEdit }: SortableExerciseInSupersetProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: exercise.id });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1 : 0,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-2 p-3",
        "transition-colors hover:bg-zinc-800/50",
        isDragging && "bg-zinc-800/70"
      )}
    >
      {/* Content - clickable to edit */}
      <button
        type="button"
        onClick={onEdit}
        className="flex-1 min-w-0 text-left"
      >
        <p className="font-medium">{exercise.exercise.name}</p>
        <p className="text-sm text-muted-foreground">
          {formatExerciseSummary(exercise)}
        </p>
      </button>

      {/* Drag handle on the right */}
      <button
        type="button"
        className="shrink-0 p-1 cursor-grab active:cursor-grabbing touch-none"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4 text-zinc-500" />
      </button>
    </div>
  );
}

interface SupersetItemCardProps {
  item: WorkoutItemFormData;
  onEdit: () => void;
  onDelete: () => void;
  onEditExercise: (exercise: WorkoutItemExerciseFormData) => void;
  onReorderExercises?: (itemId: string, exercises: WorkoutItemExerciseFormData[]) => void;
  dragHandleProps?: React.HTMLAttributes<HTMLButtonElement>;
}

export function SupersetItemCard({
  item,
  onEdit,
  onDelete,
  onEditExercise,
  onReorderExercises,
  dragHandleProps,
}: SupersetItemCardProps) {
  // DnD sensors for internal exercise reordering
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Handle drag end for reordering exercises within superset
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = item.exercises.findIndex((ex) => ex.id === active.id);
      const newIndex = item.exercises.findIndex((ex) => ex.id === over.id);

      const reorderedExercises = arrayMove(item.exercises, oldIndex, newIndex).map(
        (ex, index) => ({ ...ex, position: index + 1 })
      );

      onReorderExercises?.(item.id, reorderedExercises);
    }
  };

  return (
    <div
      className={cn(
        "rounded-lg border border-zinc-800 bg-zinc-900/50",
        "transition-all duration-200 hover:border-zinc-700"
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-2 p-3 border-b border-zinc-800">
        {/* Drag handle for whole superset */}
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
          className="shrink-0 h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/20"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Exercises list with internal drag & drop */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        modifiers={[restrictToVerticalAxis, restrictToParentElement]}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={item.exercises.map((ex) => ex.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="divide-y divide-zinc-800">
            {item.exercises.map((exercise) => (
              <SortableExerciseInSuperset
                key={exercise.id}
                exercise={exercise}
                onEdit={() => onEditExercise(exercise)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}
