"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  X,
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
import {
  startSession,
  getActiveSession,
  updateSession,
  SessionError,
  type WorkoutSession,
} from "@/lib/api/sessions";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// Workout Card Component
function WorkoutCard({
  workout,
  onEdit,
  onDelete,
  onDuplicate,
  onStart,
  startDisabled = false,
}: {
  workout: Workout;
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onStart: () => void;
  startDisabled?: boolean;
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

  // Format last execution date
  const formatLastExecutionDate = (dateStr: string | null): string | null => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Aujourd'hui";
    if (diffDays === 1) return "Hier";
    if (diffDays < 7) return `Il y a ${diffDays} jours`;
    if (diffDays < 30) {
      const weeks = Math.floor(diffDays / 7);
      return `Il y a ${weeks} semaine${weeks > 1 ? "s" : ""}`;
    }
    // Format as date for older sessions
    return date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
  };
  const lastExecutionDate = formatLastExecutionDate(workout.lastCompletedAt);

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
            disabled={startDisabled}
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
      <h3 className="mb-2 text-lg font-semibold">Aucune séance</h3>
      <p className="mb-6 max-w-xs text-sm text-muted-foreground">
        Créez votre première séance d&apos;entraînement pour commencer
      </p>
      <Button onClick={onAdd} className="gap-2">
        <Plus className="h-4 w-4" />
        Créer une séance
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
  const [activeSession, setActiveSession] = useState<WorkoutSession | null>(null);
  const [isAbandoningSession, setIsAbandoningSession] = useState(false);

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
      toast.error("Erreur lors du chargement des séances");
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  // Load active session
  const loadActiveSession = useCallback(async () => {
    if (!token) return;
    try {
      const result = await getActiveSession(token);
      setActiveSession(result.data);
    } catch (error) {
      console.error("Failed to load active session:", error);
    }
  }, [token]);

  useEffect(() => {
    loadWorkouts();
    loadActiveSession();
  }, [loadWorkouts, loadActiveSession]);

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
      toast.success("Séance supprimée");
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
      toast.success("Séance dupliquée");
      loadWorkouts();
    } catch (error) {
      console.error("Failed to duplicate workout:", error);
      toast.error("Erreur lors de la duplication");
    }
  };

  const handleStartClick = async (workout: Workout) => {
    if (!token || activeSession) return;

    try {
      const result = await startSession(token, workout.id);
      router.push(`/session/${result.data.id}`);
    } catch (error) {
      if (error instanceof SessionError) {
        if (error.code === "SESSION_ALREADY_ACTIVE" && error.activeSessionId) {
          // Refresh active session state
          loadActiveSession();
        } else {
          toast.error(error.message);
        }
      } else {
        console.error("Failed to start session:", error);
        toast.error("Erreur lors du démarrage de la séance");
      }
    }
  };

  const handleResumeSession = () => {
    if (activeSession) {
      router.push(`/session/${activeSession.id}`);
    }
  };

  const handleAbandonSession = async () => {
    if (!token || !activeSession) return;

    setIsAbandoningSession(true);
    try {
      await updateSession(token, activeSession.id, { status: "abandoned" });
      setActiveSession(null);
      toast.success("Séance abandonnée");
    } catch (error) {
      console.error("Failed to abandon session:", error);
      toast.error("Erreur lors de l'abandon de la séance");
    } finally {
      setIsAbandoningSession(false);
    }
  };

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="pb-24">
        <PageHeader title="Séances" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-[122px] animate-pulse rounded-xl border border-zinc-800/80 bg-zinc-900/40"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="pb-24">
      <PageHeader title="Séances" />

      {/* Active session banner */}
      {activeSession && (
        <>
          <div className="mb-6 flex items-center gap-3 py-3 border-l-2 border-primary pl-4 bg-gradient-to-r from-primary/5 to-transparent">
            {/* Pulsing indicator */}
            <div className="relative shrink-0">
              <div className="h-2.5 w-2.5 rounded-full bg-primary" />
              <div className="absolute inset-0 h-2.5 w-2.5 rounded-full bg-primary animate-ping opacity-75" />
            </div>

            {/* Session info */}
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">En cours</p>
              <p className="font-medium text-zinc-100 truncate">
                {activeSession.workout?.name || "Workout"}
              </p>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-1 shrink-0">
              <Button
                size="icon"
                onClick={handleResumeSession}
                className="h-9 w-9"
                title="Reprendre la séance"
              >
                <Play className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleAbandonSession}
                disabled={isAbandoningSession}
                className="h-9 w-9 text-zinc-500 hover:text-red-400 hover:bg-red-500/10"
                title="Arrêter la séance"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Separator */}
          <div className="mb-4 border-b border-zinc-800/50" />
        </>
      )}

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
                startDisabled={!!activeSession}
              />
            ))}
          </div>

          {/* Counter */}
          <p className="text-center text-xs text-muted-foreground mt-6">
            {workouts.length} séance{workouts.length > 1 ? "s" : ""}
          </p>
        </>
      )}

      {/* Delete Dialog */}
      <ConfirmDeleteDialog
        open={!!deletingWorkout}
        onOpenChange={(open) => {
          if (!open) setDeletingWorkout(null);
        }}
        title="Supprimer la séance"
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
