"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Play,
  Trash2,
  Copy,
  Dumbbell,
  CalendarClock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout";
import { ConfirmDeleteDialog } from "@/components/ui/confirm-delete-dialog";
import { MuscleGroupBadge } from "@/components/exercises";
import { MuscleGroup } from "@/lib/constants/muscle-groups";
import { useAuthStore } from "@/stores/auth";
import {
  getWorkouts,
  deleteWorkout,
  duplicateWorkout,
  type Workout,
} from "@/lib/api/workouts";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// Workout Card Component
function WorkoutCard({
  workout,
  onEdit,
  onDelete,
  onDuplicate,
  onStart,
}: {
  workout: Workout;
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onStart: () => void;
}) {
  // Count total exercises across all items
  const exerciseCount = workout.items.reduce((acc, item) => {
    return acc + item.exercises.length;
  }, 0);

  // Extract muscle groups sorted by frequency (most used first)
  const allMuscleGroups = workout.items.flatMap((item) =>
    item.exercises.flatMap((ex) => ex.exercise.muscleGroups)
  );
  const muscleGroupCounts = allMuscleGroups.reduce((acc, group) => {
    acc[group] = (acc[group] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const muscleGroups = Object.entries(muscleGroupCounts)
    .sort((a, b) => b[1] - a[1]) // Sort by count descending
    .map(([group]) => group as MuscleGroup);

  // TODO: Get last execution date from workout sessions when implemented
  const lastExecutionDate: string | null = null;

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
          <Button
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              onStart();
            }}
            className="h-8 w-8"
            title="Démarrer la séance"
          >
            <Play className="h-4 w-4" />
            <span className="sr-only">Démarrer</span>
          </Button>

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
      <div className="h-px bg-gradient-to-r from-primary/30 to-transparent my-3" />

      {/* Stats row */}
      <div className="flex items-center gap-2 text-xs text-zinc-500">
        <span className="flex items-center gap-1.5">
          <Dumbbell className="h-3.5 w-3.5" />
          {exerciseCount} exercice{exerciseCount > 1 ? "s" : ""}
        </span>
        <span className="text-zinc-700">·</span>
        <span className="flex items-center gap-1.5">
          <CalendarClock className="h-3.5 w-3.5" />
          {lastExecutionDate ?? "Jamais réalisée"}
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

// Empty State Component
function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500/20 to-transparent border border-orange-500/20">
        <Dumbbell className="h-8 w-8 text-orange-400" />
      </div>
      <h3 className="mb-2 text-lg font-semibold">Aucun programme</h3>
      <p className="mb-6 max-w-xs text-sm text-muted-foreground">
        Créez votre premier programme d&apos;entraînement pour commencer
      </p>
      <Button onClick={onAdd} className="gap-2">
        <Plus className="h-4 w-4" />
        Créer un programme
      </Button>
    </div>
  );
}


export default function WorkoutsPage() {
  const router = useRouter();
  const { token } = useAuthStore();
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingWorkout, setDeletingWorkout] = useState<Workout | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Load workouts
  const loadWorkouts = useCallback(async () => {
    if (!token) return;

    setIsLoading(true);
    try {
      const data = await getWorkouts(token);
      // Sort alphabetically by name
      const sorted = [...data.data].sort((a, b) =>
        a.name.localeCompare(b.name, "fr", { sensitivity: "base" })
      );
      setWorkouts(sorted);
    } catch (error) {
      console.error("Failed to load workouts:", error);
      toast.error("Erreur lors du chargement des programmes");
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadWorkouts();
  }, [loadWorkouts]);

  // Handlers
  const handleAddClick = () => {
    router.push("/workouts/new");
  };

  const handleEditClick = (workout: Workout) => {
    router.push(`/workouts/${workout.id}/edit`);
  };

  const handleDeleteClick = (workout: Workout) => {
    setDeletingWorkout(workout);
  };

  const handleDeleteConfirm = async () => {
    if (!token || !deletingWorkout) return;

    setIsDeleting(true);
    try {
      await deleteWorkout(token, deletingWorkout.id);
      toast.success("Programme supprimé");
      setDeletingWorkout(null);
      loadWorkouts();
    } catch (error) {
      console.error("Failed to delete workout:", error);
      toast.error("Erreur lors de la suppression");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDuplicateClick = async (workout: Workout) => {
    if (!token) return;

    try {
      await duplicateWorkout(token, workout.id);
      toast.success("Programme dupliqué");
      loadWorkouts();
    } catch (error) {
      console.error("Failed to duplicate workout:", error);
      toast.error("Erreur lors de la duplication");
    }
  };

  const handleStartClick = (_workout: Workout) => {
    // TODO: Navigate to workout session page
    toast.info("Fonctionnalité à venir");
  };

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="pb-24">
        <PageHeader title="Séances" />
        <div className="space-y-4">
          {/* Start workout button skeleton */}
          <div className="h-14 animate-pulse rounded-lg bg-secondary/50" />

          {/* Section header skeleton */}
          <div className="h-5 w-32 animate-pulse rounded bg-secondary/50 mt-6" />

          {/* Cards skeleton */}
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-28 animate-pulse rounded-lg bg-secondary/50"
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-24">
      <PageHeader title="Séances" />

      {workouts.length === 0 ? (
        <EmptyState onAdd={handleAddClick} />
      ) : (
        <>
          <div className="space-y-3">
            {workouts.map((workout) => (
              <WorkoutCard
                key={workout.id}
                workout={workout}
                onEdit={() => handleEditClick(workout)}
                onDelete={() => handleDeleteClick(workout)}
                onDuplicate={() => handleDuplicateClick(workout)}
                onStart={() => handleStartClick(workout)}
              />
            ))}
          </div>

          {/* Counter */}
          <p className="text-center text-xs text-muted-foreground mt-6">
            {workouts.length} programme{workouts.length > 1 ? "s" : ""}
          </p>
        </>
      )}

      {/* Delete Dialog */}
      <ConfirmDeleteDialog
        open={!!deletingWorkout}
        onOpenChange={(open) => {
          if (!open) setDeletingWorkout(null);
        }}
        title="Supprimer le programme"
        description={
          <>
            Êtes-vous sûr de vouloir supprimer{" "}
            <span className="font-medium text-zinc-100">{deletingWorkout?.name}</span> ?
            <br />
            Cette action est irréversible.
          </>
        }
        onConfirm={handleDeleteConfirm}
        isDeleting={isDeleting}
      />

      {/* Floating Add Button */}
      {workouts.length > 0 && (
        <div className="fixed bottom-20 right-4 z-50">
          <Button
            size="lg"
            onClick={handleAddClick}
            className="h-14 w-14 rounded-full shadow-lg shadow-black/30 p-0"
          >
            <Plus className="h-6 w-6" />
          </Button>
        </div>
      )}
    </div>
  );
}
