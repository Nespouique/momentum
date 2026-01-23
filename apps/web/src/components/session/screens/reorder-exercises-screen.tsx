"use client";

import { useState, useEffect, useRef } from "react";
import { Check } from "lucide-react";
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { ExerciseCard, ExerciseItemData } from "../exercise-card";

interface ExerciseItem {
  id: string;
  name: string;
  muscleGroups: string[];
  totalSets: number;
  firstSetTarget: { reps: number; weight: number | null };
}

interface SupersetItem {
  workoutItemId: string;
  rounds: number;
  exercises: ExerciseItem[];
}

export type ReorderItem =
  | { type: "exercise"; data: ExerciseItem }
  | { type: "superset"; data: SupersetItem };

interface ReorderExercisesScreenProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: ReorderItem[];
  onConfirm: (exerciseIds: string[]) => void;
  isSubmitting?: boolean;
}

export function ReorderExercisesScreen({
  open,
  onOpenChange,
  items: initialItems,
  onConfirm,
  isSubmitting = false,
}: ReorderExercisesScreenProps) {
  const [items, setItems] = useState<ReorderItem[]>([]);

  // Track previous open state to only reset on open transition
  const wasOpenRef = useRef(false);

  useEffect(() => {
    if (open && !wasOpenRef.current) {
      setItems(initialItems);
    }
    wasOpenRef.current = open;
  }, [open, initialItems]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Get unique ID for each item (exercise id or superset workoutItemId)
  const getItemId = (item: ReorderItem) =>
    item.type === "exercise" ? item.data.id : item.data.workoutItemId;

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = items.findIndex((item) => getItemId(item) === active.id);
      const newIndex = items.findIndex((item) => getItemId(item) === over.id);
      setItems(arrayMove(items, oldIndex, newIndex));
    }
  };

  const handleConfirm = () => {
    // Flatten items back to exercise IDs
    const exerciseIds: string[] = [];
    for (const item of items) {
      if (item.type === "exercise") {
        exerciseIds.push(item.data.id);
      } else {
        // Add all exercise IDs from the superset
        for (const ex of item.data.exercises) {
          exerciseIds.push(ex.id);
        }
      }
    }
    onConfirm(exerciseIds);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] flex flex-col">
        <SheetHeader className="shrink-0">
          <SheetTitle>Réorganiser les exercices</SheetTitle>
        </SheetHeader>

        {/* Instructions */}
        <p className="py-3 text-sm text-zinc-400">
          Glissez pour changer l'ordre des exercices restants
        </p>

        {/* Sortable list */}
        <div className="flex-1 overflow-y-auto -mx-6 px-6 space-y-2">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            modifiers={[restrictToVerticalAxis, restrictToParentElement]}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={items.map(getItemId)} strategy={verticalListSortingStrategy}>
              {items.map((item) => (
                <SortableItem key={getItemId(item)} item={item} />
              ))}
            </SortableContext>
          </DndContext>
        </div>

        {/* Footer */}
        <SheetFooter className="shrink-0 mt-4">
          <Button
            onClick={handleConfirm}
            disabled={isSubmitting}
            size="lg"
            className="w-full h-14 text-base font-semibold"
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <span className="animate-spin h-4 w-4 border-2 border-white/30 border-t-white rounded-full" />
                Enregistrement...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Check className="h-5 w-5" />
                Confirmer
              </span>
            )}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

interface SortableItemProps {
  item: ReorderItem;
}

function SortableItem({ item }: SortableItemProps) {
  const itemId = item.type === "exercise" ? item.data.id : item.data.workoutItemId;
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: itemId,
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
  };

  if (item.type === "exercise") {
    const exercise: ExerciseItemData = {
      name: item.data.name,
      muscleGroups: item.data.muscleGroups,
    };
    return (
      <div ref={setNodeRef} style={style}>
        <ExerciseCard
          variant="draggable"
          type="standard"
          totalSets={item.data.totalSets}
          exercise={exercise}
          dragHandleProps={{ attributes, listeners }}
          isDragging={isDragging}
        />
      </div>
    );
  }

  // Superset
  const exercises: ExerciseItemData[] = item.data.exercises.map((ex) => ({
    name: ex.name,
    muscleGroups: ex.muscleGroups,
  }));
  return (
    <div ref={setNodeRef} style={style}>
      <ExerciseCard
        variant="draggable"
        type="superset"
        totalSets={item.data.rounds}
        exercises={exercises}
        dragHandleProps={{ attributes, listeners }}
        isDragging={isDragging}
      />
    </div>
  );
}
