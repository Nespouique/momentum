"use client";

import { use, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { X, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/layout";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useSessionStore } from "@/stores/session";
import { useAuthStore } from "@/stores/auth";
import { useTimerAudio } from "@/hooks/use-timer-audio";
import { useWakeLock } from "@/hooks/use-wake-lock";
import { ExerciseSelector } from "@/components/workouts/exercise-selector";
import { MuscleGroup } from "@/lib/constants/muscle-groups";
import {
  updateSet,
  replaceSuperset,
  getProgressionSuggestions,
  updateProgressionSuggestion,
} from "@/lib/api/sessions";
import { toast } from "sonner";
import { type ProgressionSuggestion } from "@/components/session";

import {
  SessionOverviewScreen,
  ExerciseActiveScreen,
  RestScreen,
  TransitionScreen,
  SessionSummary,
  ReorderExercisesScreen,
  type SummaryExercise,
  type SetModification,
  type OverviewItem,
  type ReorderItem,
} from "@/components/session/screens";
import { SupersetProgress, type SupersetPreviewData } from "@/components/session";

interface SessionPageProps {
  params: Promise<{ id: string }>;
}

export default function SessionPage({ params }: SessionPageProps) {
  const { id: sessionId } = use(params);
  const router = useRouter();
  const { token } = useAuthStore();
  const {
    session,
    isLoading,
    error,
    currentScreen,
    currentExerciseIndex,
    currentSetIndex,
    restDuration,
    restTimeRemaining,
    restEndAt,
    isResting,
    isInSuperset,
    supersetRound,
    supersetExerciseIds,
    pendingResults,
    loadSession,
    startFromOverview,
    skipFirstExercise,
    completeSet,
    skipRest,
    adjustRestTime,
    skipExercise,
    postponeExercise,
    abandonSession,
    completeSession,
    updatePendingResult,
    pauseTimer,
    resumeTimer,
    tick,
    reset,
    getCurrentExercise,
    getNextExercise,
    getCurrentSet,
    getNextSet,
    getLastSessionSet,
    getActiveExercises,
    fetchLastPerformance,
  } = useSessionStore();

  // UI state
  const [showAbandonDialog, setShowAbandonDialog] = useState(false);
  const [showReorderScreen, setShowReorderScreen] = useState(false);
  const [showSubstituteSheet, setShowSubstituteSheet] = useState(false);
  const [showOverviewReorderScreen, setShowOverviewReorderScreen] = useState(false);
  const [showOverviewSubstituteSheet, setShowOverviewSubstituteSheet] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Progression suggestions state
  const [suggestions, setSuggestions] = useState<Map<string, ProgressionSuggestion>>(new Map());

  // Audio hook
  const { playCountdownBeep, initAudio, scheduleNotification, cancelScheduledNotification } =
    useTimerAudio();

  // Wake lock
  useWakeLock(!!session && session.status === "in_progress");

  // Load session on mount
  useEffect(() => {
    if (token && sessionId) {
      loadSession(token, sessionId);
    }
    return () => reset();
  }, [token, sessionId, loadSession, reset]);

  // Timer tick
  useEffect(() => {
    if (!session || session.status !== "in_progress") return;

    const interval = setInterval(() => {
      tick();
    }, 1000);

    return () => clearInterval(interval);
  }, [session, tick]);

  // Pause/resume timer when sheets open/close
  useEffect(() => {
    if (showReorderScreen || showSubstituteSheet || showOverviewReorderScreen || showOverviewSubstituteSheet) {
      pauseTimer();
    } else {
      resumeTimer();
    }
  }, [showReorderScreen, showSubstituteSheet, showOverviewReorderScreen, showOverviewSubstituteSheet, pauseTimer, resumeTimer]);

  // Play countdown beeps
  useEffect(() => {
    if (restTimeRemaining > 0 && restTimeRemaining <= 5) {
      playCountdownBeep(restTimeRemaining);
    } else if (restTimeRemaining === 0 && restDuration > 0) {
      playCountdownBeep(0);
    }
  }, [restTimeRemaining, restDuration, playCountdownBeep]);

  // Schedule background notification when rest starts (reliable on mobile)
  // Do NOT cancel in the else branch — cancellation causes a race condition
  // where the notification is cleared before the setTimeout callback fires.
  // The notification is cancelled either:
  //   - by scheduleNotification() itself when a new rest starts (clears previous timeout)
  //   - by handleSkipRest() when the user manually skips rest
  //   - by the useTimerAudio cleanup on unmount
  useEffect(() => {
    if (isResting && restEndAt) {
      scheduleNotification(restEndAt);
    }
  }, [isResting, restEndAt, scheduleNotification]);

  // Catch-up on visibilitychange: play sound + tick when user returns to the tab
  useEffect(() => {
    if (!session || session.status !== "in_progress") return;

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        // User is back — cancel any pending notifications (SW + page setTimeout)
        // to avoid a duplicate alert firing after they've already returned
        cancelScheduledNotification();

        // Check rest state BEFORE tick (tick calls skipRest which clears restEndAt)
        const state = useSessionStore.getState();
        const restEndedWhileAway =
          state.isResting && state.restEndAt && state.restEndAt <= Date.now();

        // Tick to sync timer state (may call skipRest and transition screens)
        tick();

        // Play completion sound if rest ended while backgrounded
        if (restEndedWhileAway) {
          playCountdownBeep(0);
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [session, tick, playCountdownBeep, cancelScheduledNotification]);

  // Fetch progression suggestions when entering summary screen
  useEffect(() => {
    if (currentScreen !== "summary" || !token || !session) return;

    const fetchSuggestions = async () => {
      try {
        const suggestionsResponse = await getProgressionSuggestions(token, session.id);

        // Process suggestions
        const suggestionsMap = new Map<string, ProgressionSuggestion>();
        for (const s of suggestionsResponse.data) {
          suggestionsMap.set(s.exerciseId, {
            id: s.id,
            exerciseId: s.exerciseId,
            exerciseName: s.exerciseName,
            suggestionType: s.suggestionType,
            currentValue: s.currentValue,
            suggestedValue: s.suggestedValue,
            reason: s.reason,
            status: s.status,
          });
        }
        setSuggestions(suggestionsMap);
      } catch (error) {
        console.error("Failed to fetch suggestions:", error);
      }
    };

    fetchSuggestions();
  }, [currentScreen, token, session]);

  // Current exercise and set
  const currentExercise = getCurrentExercise();
  const currentSet = getCurrentSet();
  const nextSet = getNextSet();
  const nextExercise = getNextExercise();
  const activeExercises = getActiveExercises();

  // Manual skip: cancel scheduled notification before skipping rest
  const handleSkipRest = useCallback(() => {
    cancelScheduledNotification();
    skipRest();
  }, [cancelScheduledNotification, skipRest]);

  // Handlers
  const handleCompleteSet = useCallback(async () => {
    if (!token || !currentExercise || !currentSet) return;
    initAudio();

    // Key includes setIndex to get the correct pending result
    const pendingResult = pendingResults.get(`${currentExercise.id}-${currentSetIndex}`) || {
      reps: currentSet.targetReps,
      weight: currentSet.targetWeight || 0,
    };

    setIsSubmitting(true);
    await completeSet(token, pendingResult);
    setIsSubmitting(false);
  }, [token, currentExercise, currentSet, currentSetIndex, pendingResults, completeSet, initAudio]);

  const handleResultChange = useCallback(
    (value: { reps: number; weight: number }) => {
      if (currentExercise) {
        // Pass setIndex to store result with the correct key
        updatePendingResult(currentExercise.id, currentSetIndex, value);
      }
    },
    [currentExercise, currentSetIndex, updatePendingResult]
  );

  const handleSupersetResultChange = useCallback(
    (exerciseId: string, value: { reps: number; weight: number }) => {
      // Pass setIndex to store result with the correct key
      updatePendingResult(exerciseId, currentSetIndex, value);
    },
    [currentSetIndex, updatePendingResult]
  );

  const handleSkipExercise = useCallback(async () => {
    if (!token) return;
    setIsSubmitting(true);
    await skipExercise(token);
    setIsSubmitting(false);
  }, [token, skipExercise]);

  const handlePostponeExercise = useCallback(() => {
    setShowReorderScreen(true);
  }, []);

  const handleSubstituteExercise = useCallback(() => {
    setShowSubstituteSheet(true);
  }, []);

  const handleConfirmReorder = useCallback(
    async (exerciseIds: string[]) => {
      if (!token) return;
      setIsSubmitting(true);
      await postponeExercise(token, exerciseIds);
      setIsSubmitting(false);
      setShowReorderScreen(false);
    },
    [token, postponeExercise]
  );

  const handleConfirmSubstitute = useCallback(
    async (exercises: { id: string }[]) => {
      if (!token || !session || !nextExercise?.workoutItem?.id || exercises.length === 0) return;
      setIsSubmitting(true);
      try {
        const exerciseIds = exercises.map((e) => e.id);
        // Fetch last performance for all exercises in parallel with API call
        await Promise.all([
          replaceSuperset(
            token,
            session.id,
            nextExercise.workoutItem.id,
            exerciseIds
          ),
          ...exerciseIds.map((id) => fetchLastPerformance(token, id)),
        ]);
        // Reload session to get updated exercises (cache is already populated)
        await loadSession(token, session.id);
      } catch (error) {
        console.error("Failed to substitute exercise:", error);
      } finally {
        setIsSubmitting(false);
        setShowSubstituteSheet(false);
      }
    },
    [token, session, nextExercise, loadSession, fetchLastPerformance]
  );

  const handleAbandon = useCallback(async () => {
    if (!token) return;
    setIsSubmitting(true);
    await abandonSession(token);
    setIsSubmitting(false);
    router.push("/workouts");
  }, [token, abandonSession, router]);

  const handleComplete = useCallback(
    async (modifications: SetModification[]) => {
      if (!token || !session) return;
      setIsSubmitting(true);

      try {
        // Send all modifications in parallel
        if (modifications.length > 0) {
          await Promise.all(
            modifications.map((mod) =>
              updateSet(token, session.id, mod.setId, {
                actualReps: mod.reps,
                actualWeight: mod.weight,
              })
            )
          );
        }

        // Complete the session
        await completeSession(token);
        router.push("/workouts");
      } catch (error) {
        console.error("Failed to complete session:", error);
      } finally {
        setIsSubmitting(false);
      }
    },
    [token, session, completeSession, router]
  );

  // Progression suggestion handlers
  const handleAcceptSuggestion = useCallback(
    async (suggestionId: string) => {
      if (!token) return;
      try {
        await updateProgressionSuggestion(token, suggestionId, "accepted");
        // Update local state to mark as accepted
        setSuggestions((prev) => {
          const next = new Map(prev);
          for (const [key, value] of next) {
            if (value.id === suggestionId) {
              next.set(key, { ...value, status: "accepted" });
              break;
            }
          }
          return next;
        });
        toast.success("Objectif mis à jour !");
      } catch (error) {
        console.error("Failed to accept suggestion:", error);
        toast.error("Échec de la mise à jour");
        throw error; // Re-throw to let the card handle the error state
      }
    },
    [token]
  );

  const handleDismissSuggestion = useCallback(
    async (suggestionId: string) => {
      if (!token) return;
      try {
        await updateProgressionSuggestion(token, suggestionId, "dismissed");
        // Update local state to mark as dismissed
        setSuggestions((prev) => {
          const next = new Map(prev);
          for (const [key, value] of next) {
            if (value.id === suggestionId) {
              next.set(key, { ...value, status: "dismissed" });
              break;
            }
          }
          return next;
        });
      } catch (error) {
        console.error("Failed to dismiss suggestion:", error);
        throw error; // Re-throw to let the card handle the error state
      }
    },
    [token]
  );

  // Overview screen handlers
  const handleStartSession = useCallback(() => {
    initAudio();
    startFromOverview();
  }, [initAudio, startFromOverview]);

  const handleOverviewSkipFirst = useCallback(async () => {
    if (!token) return;
    setIsSubmitting(true);
    await skipFirstExercise(token);
    setIsSubmitting(false);
  }, [token, skipFirstExercise]);

  const handleOverviewReorder = useCallback(() => {
    setShowOverviewReorderScreen(true);
  }, []);

  const handleOverviewSubstitute = useCallback(() => {
    setShowOverviewSubstituteSheet(true);
  }, []);

  const handleOverviewConfirmReorder = useCallback(
    async (exerciseIds: string[]) => {
      if (!token) return;
      setIsSubmitting(true);
      await postponeExercise(token, exerciseIds);
      setIsSubmitting(false);
      setShowOverviewReorderScreen(false);
    },
    [token, postponeExercise]
  );

  const handleOverviewConfirmSubstitute = useCallback(
    async (exercises: { id: string }[]) => {
      const firstExercise = activeExercises[0];
      if (!token || !session || !firstExercise?.workoutItem?.id || exercises.length === 0) return;
      setIsSubmitting(true);
      try {
        const exerciseIds = exercises.map((e) => e.id);
        // Fetch last performance for all exercises in parallel with API call
        await Promise.all([
          replaceSuperset(
            token,
            session.id,
            firstExercise.workoutItem.id,
            exerciseIds
          ),
          ...exerciseIds.map((id) => fetchLastPerformance(token, id)),
        ]);
        // Reload session to get updated exercises (cache is already populated)
        await loadSession(token, session.id);
      } catch (error) {
        console.error("Failed to substitute exercise:", error);
      } finally {
        setIsSubmitting(false);
        setShowOverviewSubstituteSheet(false);
      }
    },
    [token, session, activeExercises, loadSession, fetchLastPerformance]
  );

  // Loading state
  if (isLoading || !session) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 px-4">
        <p className="text-destructive text-center">{error}</p>
        <Button onClick={() => router.push("/workouts")}>Retour aux workouts</Button>
      </div>
    );
  }

  // Build remaining items for reorder sheet (grouped by superset)
  const buildRemainingItems = (): ReorderItem[] => {
    const remaining = activeExercises.slice(currentExerciseIndex + 1);
    const items: ReorderItem[] = [];
    const processedWorkoutItemIds = new Set<string>();

    for (const ex of remaining) {
      const workoutItem = ex.workoutItem;
      const workoutItemId = workoutItem?.id;

      // Check if this workoutItemId has multiple exercises (superset detection by count)
      if (workoutItemId) {
        if (processedWorkoutItemIds.has(workoutItemId)) continue;
        processedWorkoutItemIds.add(workoutItemId);

        const supersetExercises = remaining.filter(
          (e) => e.workoutItem?.id === workoutItemId
        );

        // If multiple exercises share the same workoutItemId, it's a superset
        if (supersetExercises.length > 1) {
          items.push({
            type: "superset",
            data: {
              workoutItemId: workoutItemId,
              rounds: supersetExercises[0]?.sets.length || workoutItem?.rounds || 1,
              exercises: supersetExercises.map((e) => ({
                id: e.id,
                name: e.exercise.name,
                muscleGroups: e.exercise.muscleGroups,
                totalSets: e.sets.length,
                firstSetTarget: {
                  reps: e.sets[0]?.targetReps || 0,
                  weight: e.sets[0]?.targetWeight ?? null,
                },
              })),
            },
          });
        } else {
          // Single exercise
          items.push({
            type: "exercise",
            data: {
              id: ex.id,
              name: ex.exercise.name,
              muscleGroups: ex.exercise.muscleGroups,
              totalSets: ex.sets.length,
              firstSetTarget: {
                reps: ex.sets[0]?.targetReps || 0,
                weight: ex.sets[0]?.targetWeight ?? null,
              },
            },
          });
        }
      } else {
        // No workoutItem - treat as single exercise
        items.push({
          type: "exercise",
          data: {
            id: ex.id,
            name: ex.exercise.name,
            muscleGroups: ex.exercise.muscleGroups,
            totalSets: ex.sets.length,
            firstSetTarget: {
              reps: ex.sets[0]?.targetReps || 0,
              weight: ex.sets[0]?.targetWeight ?? null,
            },
          },
        });
      }
    }

    return items;
  };

  // Build all items for overview reorder sheet (grouped by superset)
  const buildAllReorderItems = (): ReorderItem[] => {
    const items: ReorderItem[] = [];
    const processedWorkoutItemIds = new Set<string>();

    for (const ex of activeExercises) {
      const workoutItem = ex.workoutItem;
      const workoutItemId = workoutItem?.id;

      // Check if this workoutItemId has multiple exercises (superset detection by count)
      if (workoutItemId) {
        if (processedWorkoutItemIds.has(workoutItemId)) continue;
        processedWorkoutItemIds.add(workoutItemId);

        const supersetExercises = activeExercises.filter(
          (e) => e.workoutItem?.id === workoutItemId
        );

        // If multiple exercises share the same workoutItemId, it's a superset
        if (supersetExercises.length > 1) {
          items.push({
            type: "superset",
            data: {
              workoutItemId: workoutItemId,
              rounds: supersetExercises[0]?.sets.length || workoutItem?.rounds || 1,
              exercises: supersetExercises.map((e) => ({
                id: e.id,
                name: e.exercise.name,
                muscleGroups: e.exercise.muscleGroups,
                totalSets: e.sets.length,
                firstSetTarget: {
                  reps: e.sets[0]?.targetReps || 0,
                  weight: e.sets[0]?.targetWeight ?? null,
                },
              })),
            },
          });
        } else {
          // Single exercise
          items.push({
            type: "exercise",
            data: {
              id: ex.id,
              name: ex.exercise.name,
              muscleGroups: ex.exercise.muscleGroups,
              totalSets: ex.sets.length,
              firstSetTarget: {
                reps: ex.sets[0]?.targetReps || 0,
                weight: ex.sets[0]?.targetWeight ?? null,
              },
            },
          });
        }
      } else {
        // No workoutItem - treat as single exercise
        items.push({
          type: "exercise",
          data: {
            id: ex.id,
            name: ex.exercise.name,
            muscleGroups: ex.exercise.muscleGroups,
            totalSets: ex.sets.length,
            firstSetTarget: {
              reps: ex.sets[0]?.targetReps || 0,
              weight: ex.sets[0]?.targetWeight ?? null,
            },
          },
        });
      }
    }

    return items;
  };

  // Get last session data for comparison
  const lastSetData =
    currentExercise && currentSet
      ? getLastSessionSet(currentExercise.id, currentSet.setNumber)
      : null;
  const lastNextSetData =
    currentExercise && nextSet
      ? getLastSessionSet(currentExercise.id, nextSet.setNumber)
      : null;

  // Check if next exercise is start of a superset (with multiple exercises)
  const isNextExerciseSuperset = () => {
    if (!nextExercise) return false;
    // Check if there are multiple exercises sharing the same workoutItemId
    // This handles both original supersets and dynamically created ones (from replacement)
    const workoutItemId = nextExercise.workoutItem?.id;
    if (!workoutItemId) return false;
    const supersetExerciseCount = activeExercises.filter(
      (ex) => ex.workoutItem?.id === workoutItemId
    ).length;
    return supersetExerciseCount > 1;
  };

  // Build next exercise data for transition screens (only for single exercises)
  const buildNextExerciseData = () => {
    if (!nextExercise || isNextExerciseSuperset()) return null;
    const firstSet = nextExercise.sets[0];
    const lastFirstSetData = getLastSessionSet(nextExercise.id, 1);
    return {
      name: nextExercise.exercise.name,
      muscleGroups: nextExercise.exercise.muscleGroups,
      totalSets: nextExercise.sets.length,
      firstSetTarget: {
        reps: firstSet?.targetReps || 0,
        weight: firstSet?.targetWeight ?? null,
      },
      lastFirstSet: lastFirstSetData
        ? { reps: lastFirstSetData.actualReps, weight: lastFirstSetData.actualWeight }
        : null,
    };
  };

  // Build next superset data for transition screens
  const buildNextSupersetData = (): SupersetPreviewData | null => {
    if (!nextExercise || !isNextExerciseSuperset()) return null;
    const workoutItem = nextExercise.workoutItem;
    if (!workoutItem) return null;

    // Get all exercises in this superset
    const supersetExercises = activeExercises.filter(
      (ex) => ex.workoutItem?.id === workoutItem.id
    );

    // Use the number of sets from the first exercise (rounds = sets per exercise)
    const totalSets = supersetExercises[0]?.sets.length || workoutItem.rounds;

    return {
      totalSets,
      exercises: supersetExercises.map((ex) => {
        const lastFirstSetData = getLastSessionSet(ex.id, 1);
        return {
          name: ex.exercise.name,
          muscleGroups: ex.exercise.muscleGroups,
          firstSetTarget: {
            reps: ex.sets[0]?.targetReps || 0,
            weight: ex.sets[0]?.targetWeight ?? null,
          },
          lastFirstSet: lastFirstSetData
            ? { reps: lastFirstSetData.actualReps, weight: lastFirstSetData.actualWeight }
            : null,
        };
      }),
    };
  };

  // Build superset exercises data for rest/transition screens
  const buildSupersetExercisesData = () => {
    return supersetExerciseIds.map((exId) => {
      const ex = session.exercises.find((e) => e.id === exId);
      // Key includes setIndex to get the correct pending result
      const pending = pendingResults.get(`${exId}-${currentSetIndex}`);
      const set = ex?.sets[currentSetIndex];
      return {
        id: exId,
        exerciseName: ex?.exercise.name || "",
        targetReps: set?.targetReps || 0,
        targetWeight: set?.targetWeight ?? null,
        value: pending || { reps: set?.targetReps || 0, weight: set?.targetWeight || 0 },
      };
    });
  };

  // Build overview items data (grouped by superset)
  const buildOverviewItems = (): OverviewItem[] => {
    const items: OverviewItem[] = [];
    const processedWorkoutItemIds = new Set<string>();

    for (const ex of activeExercises) {
      const workoutItem = ex.workoutItem;
      const workoutItemId = workoutItem?.id;

      // Check if this workoutItemId has multiple exercises (superset detection by count)
      if (workoutItemId) {
        if (processedWorkoutItemIds.has(workoutItemId)) continue;
        processedWorkoutItemIds.add(workoutItemId);

        const supersetExercises = activeExercises.filter(
          (e) => e.workoutItem?.id === workoutItemId
        );

        // If multiple exercises share the same workoutItemId, it's a superset
        if (supersetExercises.length > 1) {
          items.push({
            type: "superset",
            data: {
              workoutItemId: workoutItemId,
              rounds: supersetExercises[0]?.sets.length || workoutItem?.rounds || 1,
              exercises: supersetExercises.map((e) => ({
                id: e.id,
                name: e.exercise.name,
                muscleGroups: e.exercise.muscleGroups,
                totalSets: e.sets.length,
                firstSetTarget: {
                  reps: e.sets[0]?.targetReps || 0,
                  weight: e.sets[0]?.targetWeight ?? null,
                },
              })),
            },
          });
        } else {
          // Single exercise
          items.push({
            type: "exercise",
            data: {
              id: ex.id,
              name: ex.exercise.name,
              muscleGroups: ex.exercise.muscleGroups,
              totalSets: ex.sets.length,
              firstSetTarget: {
                reps: ex.sets[0]?.targetReps || 0,
                weight: ex.sets[0]?.targetWeight ?? null,
              },
            },
          });
        }
      } else {
        // No workoutItem - treat as single exercise
        items.push({
          type: "exercise",
          data: {
            id: ex.id,
            name: ex.exercise.name,
            muscleGroups: ex.exercise.muscleGroups,
            totalSets: ex.sets.length,
            firstSetTarget: {
              reps: ex.sets[0]?.targetReps || 0,
              weight: ex.sets[0]?.targetWeight ?? null,
            },
          },
        });
      }
    }

    return items;
  };

  // Render current screen
  const renderScreen = () => {
    // Overview screen (before starting)
    if (currentScreen === "overview") {
      return (
        <SessionOverviewScreen
          items={buildOverviewItems()}
          onStart={handleStartSession}
          onSkipFirst={handleOverviewSkipFirst}
          onReorder={handleOverviewReorder}
          onSubstituteFirst={handleOverviewSubstitute}
          isSubmitting={isSubmitting}
        />
      );
    }

    if (!currentExercise || !currentSet) return null;

    // Key includes setIndex to get the correct pending result
    const defaultResult = pendingResults.get(`${currentExercise.id}-${currentSetIndex}`) || {
      reps: currentSet.targetReps,
      weight: currentSet.targetWeight || 0,
    };

    // Exercise active screen (with or without superset header)
    if (currentScreen === "exercise" || currentScreen === "superset-exercise") {
      // For dynamically created supersets, rounds = sets.length
      const totalRounds = currentExercise.sets.length || currentExercise.workoutItem?.rounds || 1;

      return (
        <div className="flex flex-col h-full">
          {isInSuperset && (
            <div className="shrink-0 px-4 pt-4">
              <SupersetProgress
                currentRound={supersetRound}
                totalRounds={totalRounds}
                exercises={supersetExerciseIds.map((id) => {
                  const ex = session.exercises.find((e) => e.id === id);
                  const exIdx = activeExercises.findIndex((e) => e.id === id);
                  let status: "done" | "current" | "pending" = "pending";
                  if (exIdx < currentExerciseIndex) status = "done";
                  else if (exIdx === currentExerciseIndex) status = "current";
                  return {
                    id,
                    name: ex?.exercise.name || "",
                    status,
                  };
                })}
              />
            </div>
          )}
          <div className="flex-1 px-4 py-4">
            <ExerciseActiveScreen
              exerciseName={currentExercise.exercise.name}
              muscleGroups={currentExercise.exercise.muscleGroups}
              currentSet={currentSetIndex + 1}
              totalSets={currentExercise.sets.length}
              targetReps={currentSet.targetReps}
              targetWeight={currentSet.targetWeight}
              lastReps={lastSetData?.actualReps}
              lastWeight={lastSetData?.actualWeight}
              onSetComplete={handleCompleteSet}
            />
          </div>
        </div>
      );
    }

    // Rest screen (between sets)
    if (currentScreen === "rest") {
      return (
        <div className="flex-1 px-4 py-4">
          <RestScreen
            restDuration={restDuration}
            restTimeRemaining={restTimeRemaining}
            onTimerComplete={skipRest}
            onSkip={handleSkipRest}
            onAdjust={adjustRestTime}
            exerciseName={currentExercise.exercise.name}
            setNumber={currentSetIndex + 1}
            targetReps={currentSet.targetReps}
            targetWeight={currentSet.targetWeight}
            defaultReps={defaultResult.reps}
            defaultWeight={defaultResult.weight}
            onResultChange={handleResultChange}
            // Only pass next set props if there's a next set
            {...(nextSet && {
              nextSetNumber: currentSetIndex + 2,
              nextTotalSets: currentExercise.sets.length,
              nextTargetReps: nextSet.targetReps,
              nextTargetWeight: nextSet.targetWeight,
              lastReps: lastNextSetData?.actualReps,
              lastWeight: lastNextSetData?.actualWeight,
            })}
          />
        </div>
      );
    }

    // Transition screen (between exercises)
    if (currentScreen === "transition") {
      const nextExData = buildNextExerciseData();
      const nextSupersetData = buildNextSupersetData();
      const hasNextItem = nextExData || nextSupersetData;

      return (
        <div className="flex-1 px-4 py-4 overflow-y-auto">
          <TransitionScreen
            completedExerciseName={currentExercise.exercise.name}
            restDuration={restDuration}
            restTimeRemaining={restTimeRemaining}
            onTimerComplete={skipRest}
            onSkip={handleSkipRest}
            onAdjust={adjustRestTime}
            lastSetNumber={currentExercise.sets.length}
            targetReps={currentSet.targetReps}
            targetWeight={currentSet.targetWeight}
            defaultReps={defaultResult.reps}
            defaultWeight={defaultResult.weight}
            onResultChange={handleResultChange}
            nextExercise={nextExData}
            nextSuperset={nextSupersetData}
            // Only pass options bar handlers if there's a next item
            {...(hasNextItem && {
              onSkipExercise: handleSkipExercise,
              onPostponeExercise: handlePostponeExercise,
              onSubstituteExercise: handleSubstituteExercise,
            })}
          />
        </div>
      );
    }

    // Superset rest screen (between rounds)
    if (currentScreen === "superset-rest") {
      // For dynamically created supersets, rounds = sets.length
      const totalRounds = currentExercise.sets.length || currentExercise.workoutItem?.rounds || 1;

      // Get first exercise in superset for next set preview
      const firstSupersetExId = supersetExerciseIds[0];
      const firstSupersetEx = session.exercises.find((e) => e.id === firstSupersetExId);

      // supersetRound now points to the COMPLETED round (not pre-incremented)
      // Next round = supersetRound + 1
      const nextRoundNumber = supersetRound + 1;
      const nextSetIndex = nextRoundNumber - 1; // 0-indexed
      const nextSetData = firstSupersetEx?.sets[nextSetIndex];

      // Get last session data for the next round's set
      const lastSetData = firstSupersetEx
        ? getLastSessionSet(firstSupersetEx.id, nextRoundNumber)
        : null;

      // Only show next set preview if there's a next round
      const hasNextRound = nextRoundNumber <= totalRounds && nextSetData;

      return (
        <div className="flex-1 px-4 py-4 overflow-y-auto">
          <RestScreen
            isSuperset={true}
            setNumber={supersetRound}
            totalRounds={totalRounds}
            restDuration={restDuration}
            restTimeRemaining={restTimeRemaining}
            onTimerComplete={skipRest}
            onSkip={handleSkipRest}
            onAdjust={adjustRestTime}
            exercises={buildSupersetExercisesData()}
            onSupersetResultChange={handleSupersetResultChange}
            nextSetNumber={hasNextRound ? nextRoundNumber : undefined}
            nextTotalSets={hasNextRound ? totalRounds : undefined}
            nextTargetReps={hasNextRound ? nextSetData.targetReps : undefined}
            nextTargetWeight={hasNextRound ? nextSetData.targetWeight : undefined}
            lastReps={lastSetData?.actualReps}
            lastWeight={lastSetData?.actualWeight}
          />
        </div>
      );
    }

    // Superset transition screen (end of superset)
    if (currentScreen === "superset-transition") {
      const nextExData = buildNextExerciseData();
      const nextSupersetData = buildNextSupersetData();
      const hasNextItem = nextExData || nextSupersetData;

      // For dynamically created supersets, rounds = sets.length
      const totalRounds = currentExercise.sets.length || currentExercise.workoutItem?.rounds || 1;

      return (
        <div className="flex-1 px-4 py-4 overflow-y-auto">
          <TransitionScreen
            isSuperset={true}
            totalRounds={totalRounds}
            lastSetNumber={totalRounds}
            restDuration={restDuration}
            restTimeRemaining={restTimeRemaining}
            onTimerComplete={skipRest}
            onSkip={handleSkipRest}
            onAdjust={adjustRestTime}
            exercises={buildSupersetExercisesData()}
            onSupersetResultChange={handleSupersetResultChange}
            nextExercise={nextExData}
            nextSuperset={nextSupersetData}
            // Only pass options bar handlers if there's a next item
            {...(hasNextItem && {
              onSkipExercise: handleSkipExercise,
              onPostponeExercise: handlePostponeExercise,
              onSubstituteExercise: handleSubstituteExercise,
            })}
          />
        </div>
      );
    }

    // Summary screen
    if (currentScreen === "summary") {
      const duration = session.startedAt
        ? Math.floor((Date.now() - new Date(session.startedAt).getTime()) / 1000)
        : 0;

      // Build exercises data for summary
      const summaryExercises: SummaryExercise[] = session.exercises
        .filter((ex) => ex.status !== "substituted" && ex.status !== "skipped")
        .map((ex) => ({
          id: ex.id,
          exerciseId: ex.exerciseId,
          name: ex.exercise.name,
          sets: ex.sets.map((s) => ({
            id: s.id,
            setNumber: s.setNumber,
            targetReps: s.targetReps,
            targetWeight: s.targetWeight,
            actualReps: s.actualReps,
            actualWeight: s.actualWeight,
          })),
        }));

      return (
        <SessionSummary
          sessionId={session.id}
          workoutName={session.workout?.name || "Workout"}
          duration={duration}
          exercises={summaryExercises}
          suggestions={suggestions}
          onComplete={handleComplete}
          onAcceptSuggestion={handleAcceptSuggestion}
          onDismissSuggestion={handleDismissSuggestion}
          isSubmitting={isSubmitting}
        />
      );
    }

    return null;
  };

  return (
    <div className="flex flex-col">
      {/* Header */}
      {currentScreen !== "summary" && (
        <PageHeader
          title={session.workout?.name || "Workout"}
          actions={
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowAbandonDialog(true)}
              className="text-zinc-400 hover:text-zinc-100"
            >
              <X className="h-5 w-5" />
            </Button>
          }
        />
      )}

      {/* Main content */}
      <main className="flex-1 flex flex-col">{renderScreen()}</main>

      {/* Abandon confirmation dialog */}
      <Dialog open={showAbandonDialog} onOpenChange={setShowAbandonDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Abandonner la séance ?</DialogTitle>
            <DialogDescription>
              Ta progression sera perdue. Cette action est irréversible.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col gap-2 sm:flex-row sm:gap-2 mt-4">
            <Button
              variant="outline"
              onClick={() => setShowAbandonDialog(false)}
              className="w-full sm:w-auto"
            >
              Continuer
            </Button>
            <Button
              variant="destructive"
              onClick={handleAbandon}
              className="w-full sm:w-auto"
            >
              Abandonner
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reorder exercises sheet */}
      <ReorderExercisesScreen
        open={showReorderScreen}
        onOpenChange={setShowReorderScreen}
        items={buildRemainingItems()}
        onConfirm={handleConfirmReorder}
        isSubmitting={isSubmitting}
      />

      {/* Substitute exercise sheet (multi-select to allow creating superset) */}
      <ExerciseSelector
        open={showSubstituteSheet}
        onOpenChange={setShowSubstituteSheet}
        mode="multi"
        minSelection={1}
        onSelect={handleConfirmSubstitute}
        title="Remplacer l'exercice"
        initialMuscleGroups={
          nextExercise?.exercise.muscleGroups.filter(
            (g): g is MuscleGroup => typeof g === "string"
          ) || []
        }
        footerMessage="1 exercice = standard, 2+ = nouveau superset"
      />

      {/* Overview reorder exercises sheet */}
      <ReorderExercisesScreen
        open={showOverviewReorderScreen}
        onOpenChange={setShowOverviewReorderScreen}
        items={buildAllReorderItems()}
        onConfirm={handleOverviewConfirmReorder}
        isSubmitting={isSubmitting}
      />

      {/* Overview substitute exercise sheet (multi-select to allow creating superset) */}
      <ExerciseSelector
        open={showOverviewSubstituteSheet}
        onOpenChange={setShowOverviewSubstituteSheet}
        mode="multi"
        minSelection={1}
        onSelect={handleOverviewConfirmSubstitute}
        title="Remplacer l'exercice"
        initialMuscleGroups={
          activeExercises[0]?.exercise.muscleGroups.filter(
            (g): g is MuscleGroup => typeof g === "string"
          ) || []
        }
        footerMessage="1 exercice = standard, 2+ = nouveau superset"
      />

    </div>
  );
}
