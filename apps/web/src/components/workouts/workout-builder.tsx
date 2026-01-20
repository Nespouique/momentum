"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Plus, Dumbbell, Save, Loader2 } from "lucide-react";
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
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/layout";
import { useAuthStore } from "@/stores/auth";
import {
  createWorkout,
  updateWorkout,
  type Workout,
  type CreateWorkoutInput,
} from "@/lib/api/workouts";
import { type Exercise } from "@/lib/api/exercises";
import { toast } from "sonner";

import { AddItemDialog } from "./add-item-dialog";
import { ExerciseSelector } from "./exercise-selector";
import { ExerciseConfigDrawer } from "./exercise-config-drawer";
import { SupersetConfigDrawer } from "./superset-config-drawer";
import { RestTimePicker } from "./rest-time-picker";
import { ExerciseItemCard, SupersetItemCard } from "./workout-item-cards";
import {
  WorkoutFormData,
  WorkoutItemFormData,
  WorkoutItemExerciseFormData,
  createExerciseItem,
  createSupersetItem,
  isWorkoutValid,
} from "./types";

// Empty state component
function EmptyState({ onAdd: _onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500/20 to-transparent border border-orange-500/20">
        <Dumbbell className="h-7 w-7 text-orange-400" />
      </div>
      <h3 className="mb-2 text-base font-semibold">Aucun exercice</h3>
      <p className="mb-4 max-w-xs text-sm text-muted-foreground">
        Commencez par ajouter des exercices à votre séance
      </p>
    </div>
  );
}

// Sortable item wrapper
interface SortableWorkoutItemProps {
  item: WorkoutItemFormData;
  onEdit: () => void;
  onDelete: () => void;
  onEditExercise: (exercise: WorkoutItemExerciseFormData) => void;
}

function SortableWorkoutItem({
  item,
  onEdit,
  onDelete,
  onEditExercise,
}: SortableWorkoutItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const dragHandleProps = {
    ...attributes,
    ...listeners,
  };

  return (
    <div ref={setNodeRef} style={style}>
      {item.type === "exercise" ? (
        <ExerciseItemCard
          item={item}
          onEdit={onEdit}
          onDelete={onDelete}
          dragHandleProps={dragHandleProps}
        />
      ) : (
        <SupersetItemCard
          item={item}
          onEdit={onEdit}
          onDelete={onDelete}
          onEditExercise={onEditExercise}
          dragHandleProps={dragHandleProps}
        />
      )}
    </div>
  );
}

interface WorkoutBuilderProps {
  workout?: Workout;
  mode: "create" | "edit";
}

export function WorkoutBuilder({ workout, mode }: WorkoutBuilderProps) {
  const router = useRouter();
  const { token } = useAuthStore();

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Form state
  const [formData, setFormData] = useState<WorkoutFormData>(() => {
    if (workout) {
      // Convert API workout to form data
      return {
        name: workout.name,
        description: workout.description ?? "",
        items: workout.items.map((item) => ({
          id: item.id,
          type: item.type as "exercise" | "superset",
          position: item.position,
          rounds: item.rounds,
          restAfter: item.restAfter,
          restBetweenRounds: (item as { restBetweenRounds?: number }).restBetweenRounds ?? 60,
          exercises: item.exercises.map((ex) => ({
            id: ex.id,
            exerciseId: ex.exerciseId,
            exercise: ex.exercise as Exercise,
            position: ex.position,
            restBetweenSets: ex.restBetweenSets,
            sets: ex.sets.map((set) => ({
              id: set.id,
              setNumber: set.setNumber,
              targetReps: set.targetReps,
              targetWeight: set.targetWeight,
            })),
            sameRepsForAll: ex.sets.every((s) => s.targetReps === ex.sets[0]?.targetReps),
            sameWeightForAll: ex.sets.every((s) => s.targetWeight === ex.sets[0]?.targetWeight),
          })),
        })),
      };
    }
    return {
      name: "",
      description: "",
      items: [],
    };
  });

  // UI state
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showExerciseSelector, setShowExerciseSelector] = useState(false);
  const [exerciseSelectorMode, setExerciseSelectorMode] = useState<"single" | "multi">("single");
  const [editingExercise, setEditingExercise] = useState<{
    item: WorkoutItemFormData;
    exercise: WorkoutItemExerciseFormData;
  } | null>(null);
  const [editingSuperset, setEditingSuperset] = useState<WorkoutItemFormData | null>(null);
  const [editingSupersetExercises, setEditingSupersetExercises] = useState<WorkoutItemFormData | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Ref to track if we just confirmed exercise selection (to avoid onOpenChange overwriting state)
  const justConfirmedExercisesRef = useRef(false);

  // Validation
  const isValid = isWorkoutValid(formData);

  // Update name
  const handleNameChange = (name: string) => {
    setFormData((prev) => ({ ...prev, name }));
  };

  // Update description
  const handleDescriptionChange = (description: string) => {
    setFormData((prev) => ({ ...prev, description }));
  };

  // Add exercise item
  const handleAddExercise = () => {
    setExerciseSelectorMode("single");
    setShowExerciseSelector(true);
  };

  // Add superset item
  const handleAddSuperset = () => {
    setExerciseSelectorMode("multi");
    setShowExerciseSelector(true);
  };

  // Handle exercise selection
  const handleExerciseSelect = (exercises: Exercise[]) => {
    // Check if we're editing an existing superset's exercises
    if (editingSupersetExercises) {
      const existingItem = editingSupersetExercises;

      // Create a map of existing exercises by exerciseId
      const existingExercisesMap = new Map(
        existingItem.exercises.map((ex) => [ex.exerciseId, ex])
      );

      // Build new exercises array, preserving config for existing ones
      const newExercises = exercises.map((exercise, index) => {
        const existing = existingExercisesMap.get(exercise.id);
        if (existing) {
          return { ...existing, position: index + 1 };
        }
        // New exercise - create with default values
        return {
          id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          exerciseId: exercise.id,
          exercise,
          position: index + 1,
          restBetweenSets: 0,
          sets: Array.from({ length: existingItem.rounds }, (_, i) => ({
            id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${i}`,
            setNumber: i + 1,
            targetReps: 10,
            targetWeight: null,
          })),
          sameRepsForAll: true,
          sameWeightForAll: true,
        };
      });

      const updatedItem = { ...existingItem, exercises: newExercises };
      setFormData((prev) => ({
        ...prev,
        items: prev.items.map((item) =>
          item.id === existingItem.id ? updatedItem : item
        ),
      }));
      // Mark that we just confirmed, so onOpenChange doesn't overwrite
      justConfirmedExercisesRef.current = true;
      // Reopen superset config with updated item
      setEditingSuperset(updatedItem);
      setEditingSupersetExercises(null);
      return;
    }

    // Normal flow - creating new item
    const newItem =
      exerciseSelectorMode === "single"
        ? createExerciseItem(exercises[0]!)
        : createSupersetItem(exercises);

    newItem.position = formData.items.length + 1;

    setFormData((prev) => ({
      ...prev,
      items: [...prev.items, newItem],
    }));
  };

  // Delete item
  const handleDeleteItem = (itemId: string) => {
    setFormData((prev) => ({
      ...prev,
      items: prev.items
        .filter((item) => item.id !== itemId)
        .map((item, index) => ({ ...item, position: index + 1 })),
    }));
  };

  // Update item rest time
  const handleRestTimeChange = (itemId: string, restAfter: number) => {
    setFormData((prev) => ({
      ...prev,
      items: prev.items.map((item) =>
        item.id === itemId ? { ...item, restAfter } : item
      ),
    }));
  };

  // Handle drag end for reordering
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setFormData((prev) => {
        const oldIndex = prev.items.findIndex((item) => item.id === active.id);
        const newIndex = prev.items.findIndex((item) => item.id === over.id);

        const newItems = arrayMove(prev.items, oldIndex, newIndex);
        return {
          ...prev,
          items: newItems.map((item, index) => ({ ...item, position: index + 1 })),
        };
      });
    }
  };

  // Edit exercise
  const handleEditExercise = (
    item: WorkoutItemFormData,
    exercise: WorkoutItemExerciseFormData
  ) => {
    setEditingExercise({ item, exercise });
  };

  // Save exercise config
  const handleSaveExerciseConfig = (updatedExercise: WorkoutItemExerciseFormData) => {
    if (!editingExercise) return;

    setFormData((prev) => ({
      ...prev,
      items: prev.items.map((item) =>
        item.id === editingExercise.item.id
          ? {
              ...item,
              exercises: item.exercises.map((ex) =>
                ex.id === updatedExercise.id ? updatedExercise : ex
              ),
            }
          : item
      ),
    }));
    setEditingExercise(null);
  };

  // Open exercise selector to edit superset exercises
  const handleEditSupersetExercises = () => {
    if (!editingSuperset) return;
    setEditingSupersetExercises(editingSuperset);
    setEditingSuperset(null);
    setExerciseSelectorMode("multi");
    setShowExerciseSelector(true);
  };

  // Save superset config
  const handleSaveSupersetConfig = (updatedItem: WorkoutItemFormData) => {
    setFormData((prev) => ({
      ...prev,
      items: prev.items.map((item) => {
        if (item.id !== updatedItem.id) return item;

        // Sync number of sets for each exercise with the number of rounds
        const targetSetCount = updatedItem.rounds;
        const updatedExercises = updatedItem.exercises.map((exercise) => {
          const currentSetCount = exercise.sets.length;

          if (currentSetCount === targetSetCount) {
            return exercise;
          }

          let newSets = [...exercise.sets];

          if (targetSetCount > currentSetCount) {
            // Add sets
            const lastSet = newSets[currentSetCount - 1];
            for (let i = currentSetCount; i < targetSetCount; i++) {
              newSets.push({
                id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                setNumber: i + 1,
                targetReps: lastSet?.targetReps ?? 10,
                targetWeight: lastSet?.targetWeight ?? null,
              });
            }
          } else {
            // Remove sets
            newSets = newSets.slice(0, targetSetCount);
          }

          // Renumber sets
          newSets = newSets.map((set, idx) => ({ ...set, setNumber: idx + 1 }));

          return { ...exercise, sets: newSets };
        });

        return { ...updatedItem, exercises: updatedExercises };
      }),
    }));
    setEditingSuperset(null);
  };

  // Convert form data to API input
  const toApiInput = (): CreateWorkoutInput => ({
    name: formData.name.trim(),
    description: formData.description.trim() || null,
    items: formData.items.map((item) => ({
      type: item.type,
      position: item.position,
      rounds: item.rounds,
      restAfter: item.restAfter,
      restBetweenRounds: item.restBetweenRounds,
      exercises: item.exercises.map((ex) => ({
        exerciseId: ex.exerciseId,
        position: ex.position,
        restBetweenSets: ex.restBetweenSets,
        sets: ex.sets.map((set) => ({
          setNumber: set.setNumber,
          targetReps: set.targetReps,
          targetWeight: set.targetWeight,
        })),
      })),
    })),
  });

  // Save workout
  const handleSave = async () => {
    if (!token || !isValid) return;

    setIsSaving(true);
    try {
      const data = toApiInput();

      if (mode === "edit" && workout) {
        await updateWorkout(token, workout.id, data);
        toast.success("Programme mis à jour");
      } else {
        await createWorkout(token, data);
        toast.success("Programme créé");
      }

      router.push("/workouts");
    } catch (error) {
      console.error("Failed to save workout:", error);
      toast.error("Erreur lors de la sauvegarde");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="pb-24">
      <PageHeader
        title={mode === "create" ? "Nouvelle séance" : "Modifier la séance"}
        showBack
      />

      {/* Name input */}
      <div className="mb-4">
        <label className="text-sm font-medium mb-2 block">
          Nom du programme <span className="text-red-400">*</span>
        </label>
        <Input
          value={formData.name}
          onChange={(e) => handleNameChange(e.target.value)}
          placeholder="Ex : Séance Push"
          className="bg-zinc-900/50 border-zinc-800"
        />
      </div>

      {/* Description input */}
      <div className="mb-6">
        <label className="text-sm font-medium mb-2 block">Description</label>
        <Textarea
          value={formData.description}
          onChange={(e) => handleDescriptionChange(e.target.value)}
          placeholder="Ex: Pectoraux, épaules, triceps"
          rows={2}
          className="bg-zinc-900/50 border-zinc-800 resize-none"
        />
      </div>

      {/* Exercises section */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Exercices
          </h2>
          <Button
            size="sm"
            onClick={() => setShowAddDialog(true)}
            className="gap-1.5"
          >
            <Plus className="h-4 w-4" />
            Ajouter
          </Button>
        </div>

        {formData.items.length === 0 ? (
          <EmptyState onAdd={() => setShowAddDialog(true)} />
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={formData.items.map((item) => item.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                {formData.items.map((item, index) => (
                  <div key={item.id}>
                    <SortableWorkoutItem
                      item={item}
                      onEdit={() =>
                        item.type === "exercise"
                          ? handleEditExercise(item, item.exercises[0]!)
                          : setEditingSuperset(item)
                      }
                      onDelete={() => handleDeleteItem(item.id)}
                      onEditExercise={(exercise) => handleEditExercise(item, exercise)}
                    />
                    {/* Rest time picker between items - outside draggable */}
                    {index < formData.items.length - 1 && (
                      <div className="my-2">
                        <RestTimePicker
                          value={item.restAfter}
                          onChange={(value) => handleRestTimeChange(item.id, value)}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>

      {/* Save button */}
      <div className="mt-8">
        <Button
          size="lg"
          onClick={handleSave}
          disabled={!isValid || isSaving}
          className="w-full gap-2"
        >
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Enregistrement...
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              {mode === "create" ? "Créer le programme" : "Enregistrer"}
            </>
          )}
        </Button>
      </div>

      {/* Add item dialog */}
      <AddItemDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onSelectExercise={handleAddExercise}
        onSelectSuperset={handleAddSuperset}
      />

      {/* Exercise selector */}
      <ExerciseSelector
        open={showExerciseSelector}
        onOpenChange={(open) => {
          setShowExerciseSelector(open);
          // If closing while editing superset exercises, reopen superset config
          if (!open && editingSupersetExercises) {
            // If we just confirmed, handleExerciseSelect already handled everything
            if (justConfirmedExercisesRef.current) {
              justConfirmedExercisesRef.current = false;
              return;
            }
            // User closed without confirming, reopen superset config with original item
            setEditingSuperset(editingSupersetExercises);
            setEditingSupersetExercises(null);
          }
        }}
        mode={exerciseSelectorMode}
        onSelect={handleExerciseSelect}
        initialSelection={editingSupersetExercises?.exercises.map((ex) => ex.exercise) ?? []}
      />

      {/* Exercise config drawer */}
      <ExerciseConfigDrawer
        open={!!editingExercise}
        onOpenChange={(open) => {
          if (!open) setEditingExercise(null);
        }}
        exercise={editingExercise?.exercise ?? null}
        onSave={handleSaveExerciseConfig}
        isSuperset={editingExercise?.item.type === "superset"}
      />

      {/* Superset config drawer */}
      <SupersetConfigDrawer
        open={!!editingSuperset}
        onOpenChange={(open) => {
          if (!open) setEditingSuperset(null);
        }}
        item={editingSuperset}
        onSave={handleSaveSupersetConfig}
        onEditExercises={handleEditSupersetExercises}
      />
    </div>
  );
}
