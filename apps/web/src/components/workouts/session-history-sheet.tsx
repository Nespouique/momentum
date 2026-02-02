"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ConfirmDeleteDialog } from "@/components/ui/confirm-delete-dialog";
import { WorkoutCard } from "./workout-card";
import { useAuthStore } from "@/stores/auth";
import {
  getSessions,
  deleteSession,
  type SessionListItem,
} from "@/lib/api/sessions";
import { getWorkouts, type Workout } from "@/lib/api/workouts";
import { type MuscleGroup } from "@/lib/constants/muscle-groups";
import { toast } from "sonner";

interface SessionHistorySheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PAGE_SIZE = 10;

interface EnrichedSession extends SessionListItem {
  workoutData: Workout | null;
}

/**
 * Extracts muscle groups from a workout, sorted by frequency
 */
function extractMuscleGroups(workout: Workout | null): MuscleGroup[] {
  if (!workout) return [];

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
  return Object.entries(muscleGroupCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([group]) => group as MuscleGroup);
}

/**
 * Counts exercises that were actually performed in the session
 * (not skipped and not substituted - substituted exercises are replaced by new ones)
 */
function countPerformedExercises(session: SessionListItem): number {
  return session.exercises.filter(
    (ex) => ex.status !== "skipped" && ex.status !== "substituted"
  ).length;
}

/**
 * Maps a session to a Workout-like object for WorkoutCard
 */
function sessionToWorkoutLike(session: EnrichedSession): Workout {
  return {
    id: session.workout.id,
    name: session.workout.name,
    description: null,
    lastCompletedAt: session.completedAt,
    items: session.workoutData?.items || [],
    createdAt: session.startedAt,
    updatedAt: session.completedAt || session.startedAt,
  };
}

export function SessionHistorySheet({ open, onOpenChange }: SessionHistorySheetProps) {
  const router = useRouter();
  const { token } = useAuthStore();
  const [sessions, setSessions] = useState<EnrichedSession[]>([]);
  const [totalSessions, setTotalSessions] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [deletingSession, setDeletingSession] = useState<SessionListItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Use ref for workouts map to avoid dependency issues
  const workoutsMapRef = useRef<Map<string, Workout>>(new Map());

  // Load workouts to get muscle groups
  const loadWorkouts = useCallback(async () => {
    if (!token) return new Map<string, Workout>();

    try {
      const result = await getWorkouts(token);
      const map = new Map<string, Workout>();
      result.data.forEach((workout) => {
        map.set(workout.id, workout);
      });
      workoutsMapRef.current = map;
      return map;
    } catch (error) {
      console.error("Failed to load workouts:", error);
      return new Map<string, Workout>();
    }
  }, [token]);

  // Load sessions with pagination
  const loadSessions = useCallback(async (offset = 0, append = false) => {
    if (!token) return;

    if (offset === 0) {
      setIsLoading(true);
    } else {
      setIsLoadingMore(true);
    }

    try {
      // Load workouts first if not already loaded
      let workouts = workoutsMapRef.current;
      if (workouts.size === 0) {
        workouts = await loadWorkouts();
      }

      const result = await getSessions(token, {
        status: "completed",
        limit: PAGE_SIZE,
        offset,
      });

      // Enrich sessions with workout data
      const enrichedSessions: EnrichedSession[] = result.data.map((session) => ({
        ...session,
        workoutData: workouts.get(session.workoutId) || null,
      }));

      if (append) {
        setSessions((prev) => [...prev, ...enrichedSessions]);
      } else {
        setSessions(enrichedSessions);
      }
      setTotalSessions(result.total);
    } catch (error) {
      console.error("Failed to load sessions:", error);
      toast.error("Erreur lors du chargement de l'historique");
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, [token, loadWorkouts]);

  // Load sessions when sheet opens
  useEffect(() => {
    if (open) {
      // Reset state and load fresh data
      setSessions([]);
      workoutsMapRef.current = new Map();
      loadSessions(0, false);
    }
  }, [open, loadSessions]);

  const handleLoadMore = () => {
    loadSessions(sessions.length, true);
  };

  const handleSessionClick = (session: SessionListItem) => {
    onOpenChange(false);
    router.push(`/sessions/${session.id}`);
  };

  const handleDeleteClick = (session: SessionListItem) => {
    setDeletingSession(session);
  };

  const handleDeleteConfirm = async () => {
    if (!token || !deletingSession) return;

    setIsDeleting(true);
    try {
      await deleteSession(token, deletingSession.id);
      toast.success("Séance supprimée");
      setDeletingSession(null);
      // Reload from start
      setSessions([]);
      workoutsMapRef.current = new Map();
      loadSessions(0, false);
    } catch (error) {
      console.error("Failed to delete session:", error);
      toast.error("Erreur lors de la suppression");
    } finally {
      setIsDeleting(false);
    }
  };

  const hasMore = sessions.length < totalSessions;

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="max-h-[85vh] flex flex-col">
          <SheetHeader className="shrink-0">
            <SheetTitle>Historique des séances</SheetTitle>
            <SheetDescription>
              {totalSessions} séance{totalSessions > 1 ? "s" : ""} enregistrée
              {totalSessions > 1 ? "s" : ""}
            </SheetDescription>
          </SheetHeader>

          <div className="mt-4 overflow-y-auto flex-1 scrollbar-thin">
            {isLoading ? (
              <div className="space-y-3 pb-4">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-[120px] animate-pulse rounded-xl border border-zinc-800/80 bg-zinc-900/40"
                  />
                ))}
              </div>
            ) : sessions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <p className="text-sm text-muted-foreground">
                  Aucune séance terminée pour le moment
                </p>
              </div>
            ) : (
              <div className="space-y-3 pb-4">
                {sessions.map((session) => (
                  <WorkoutCard
                    key={session.id}
                    workout={sessionToWorkoutLike(session)}
                    variant="history"
                    completedExerciseCount={countPerformedExercises(session)}
                    sessionDate={session.completedAt}
                    overrideMuscleGroups={extractMuscleGroups(session.workoutData)}
                    onEdit={() => handleSessionClick(session)}
                    onDelete={() => handleDeleteClick(session)}
                  />
                ))}

                {/* Load more button */}
                {hasMore && (
                  <div className="pt-2 pb-4">
                    <Button
                      variant="outline"
                      onClick={handleLoadMore}
                      disabled={isLoadingMore}
                      className="w-full"
                    >
                      {isLoadingMore ? (
                        <span className="flex items-center gap-2">
                          <span className="animate-spin h-4 w-4 border-2 border-zinc-400/30 border-t-zinc-400 rounded-full" />
                          Chargement...
                        </span>
                      ) : (
                        `Charger plus (${totalSessions - sessions.length} restantes)`
                      )}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete confirmation dialog */}
      <ConfirmDeleteDialog
        open={!!deletingSession}
        onOpenChange={(open) => {
          if (!open) setDeletingSession(null);
        }}
        title="Supprimer cette séance"
        description="Cette action est irréversible. Les données de cette séance seront définitivement supprimées."
        onConfirm={handleDeleteConfirm}
        isDeleting={isDeleting}
      />
    </>
  );
}
