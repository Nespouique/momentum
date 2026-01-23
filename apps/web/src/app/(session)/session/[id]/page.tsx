"use client";

import { useEffect, useState, useCallback } from "react";
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
import { updateSet } from "@/lib/api/sessions";

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
  params: { id: string };
}

export default function SessionPage({ params }: SessionPageProps) {
  const sessionId = params.id;
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
    isInSuperset,
    supersetRound,
    supersetExerciseIds,
    pendingResults,
    loadSession,
    startFromOverview,
    skipFirstExercise,
    substituteFirstExercise,
    completeSet,
    skipRest,
    adjustRestTime,
    skipExercise,
    postponeExercise,
    substituteExercise,
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
  } = useSessionStore();

  // UI state
  const [showAbandonDialog, setShowAbandonDialog] = useState(false);
  const [showReorderScreen, setShowReorderScreen] = useState(false);
  const [showSubstituteSheet, setShowSubstituteSheet] = useState(false);
  const [showOverviewReorderScreen, setShowOverviewReorderScreen] = useState(false);
  const [showOverviewSubstituteSheet, setShowOverviewSubstituteSheet] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Audio hook
  const { playCountdownBeep, initAudio } = useTimerAudio();

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

  // Current exercise and set
  const currentExercise = getCurrentExercise();
  const currentSet = getCurrentSet();
  const nextSet = getNextSet();
  const nextExercise = getNextExercise();
  const activeExercises = getActiveExercises();

  // Handlers
  const handleCompleteSet = useCallback(async () => {
    if (!token || !currentExercise || !currentSet) return;
    initAudio();

    const pendingResult = pendingResults.get(currentExercise.id) || {
      reps: currentSet.targetReps,
      weight: currentSet.targetWeight || 0,
    };

    setIsSubmitting(true);
    await completeSet(token, pendingResult);
    setIsSubmitting(false);
  }, [token, currentExercise, currentSet, pendingResults, completeSet, initAudio]);

  const handleResultChange = useCallback(
    (value: { reps: number; weight: number }) => {
      if (currentExercise) {
        updatePendingResult(currentExercise.id, value);
      }
    },
    [currentExercise, updatePendingResult]
  );

  const handleSupersetResultChange = useCallback(
    (exerciseId: string, value: { reps: number; weight: number }) => {
      updatePendingResult(exerciseId, value);
    },
    [updatePendingResult]
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
      const firstExercise = exercises[0];
      if (!token || !firstExercise) return;
      setIsSubmitting(true);
      await substituteExercise(token, firstExercise.id);
      setIsSubmitting(false);
      setShowSubstituteSheet(false);
    },
    [token, substituteExercise]
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
      const selectedExercise = exercises[0];
      if (!token || !selectedExercise) return;
      setIsSubmitting(true);
      await substituteFirstExercise(token, selectedExercise.id);
      setIsSubmitting(false);
      setShowOverviewSubstituteSheet(false);
    },
    [token, substituteFirstExercise]
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

      if (workoutItem?.type === "superset") {
        if (processedWorkoutItemIds.has(workoutItem.id)) continue;
        processedWorkoutItemIds.add(workoutItem.id);

        const supersetExercises = remaining.filter(
          (e) => e.workoutItem?.id === workoutItem.id
        );

        items.push({
          type: "superset",
          data: {
            workoutItemId: workoutItem.id,
            rounds: workoutItem.rounds,
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

      if (workoutItem?.type === "superset") {
        if (processedWorkoutItemIds.has(workoutItem.id)) continue;
        processedWorkoutItemIds.add(workoutItem.id);

        const supersetExercises = activeExercises.filter(
          (e) => e.workoutItem?.id === workoutItem.id
        );

        items.push({
          type: "superset",
          data: {
            workoutItemId: workoutItem.id,
            rounds: workoutItem.rounds,
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

  // Check if next exercise is start of a superset
  const isNextExerciseSuperset = () => {
    if (!nextExercise) return false;
    return nextExercise.workoutItem?.type === "superset";
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
      const pending = pendingResults.get(exId);
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

      if (workoutItem?.type === "superset") {
        // Skip if already processed this superset
        if (processedWorkoutItemIds.has(workoutItem.id)) continue;
        processedWorkoutItemIds.add(workoutItem.id);

        // Get all exercises in this superset
        const supersetExercises = activeExercises.filter(
          (e) => e.workoutItem?.id === workoutItem.id
        );

        items.push({
          type: "superset",
          data: {
            workoutItemId: workoutItem.id,
            rounds: workoutItem.rounds,
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

    const defaultResult = pendingResults.get(currentExercise.id) || {
      reps: currentSet.targetReps,
      weight: currentSet.targetWeight || 0,
    };

    // Exercise active screen (with or without superset header)
    if (currentScreen === "exercise" || currentScreen === "superset-exercise") {
      const totalRounds = currentExercise.workoutItem?.rounds || 1;

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
            onSkip={skipRest}
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
            onSkip={skipRest}
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
      const totalRounds = currentExercise.workoutItem?.rounds || 1;

      // Get first exercise in superset for next set preview
      const firstSupersetExId = supersetExerciseIds[0];
      const firstSupersetEx = session.exercises.find((e) => e.id === firstSupersetExId);

      // Next round is supersetRound (current is supersetRound - 1)
      const nextRoundNumber = supersetRound;
      const nextSetIndex = nextRoundNumber - 1; // 0-indexed
      const nextSetData = firstSupersetEx?.sets[nextSetIndex];

      // Get last session data for this set
      const lastSetData = firstSupersetEx
        ? getLastSessionSet(firstSupersetEx.id, nextRoundNumber)
        : null;

      // Only show next set preview if there's a next round
      const hasNextRound = nextRoundNumber <= totalRounds && nextSetData;

      return (
        <div className="flex-1 px-4 py-4 overflow-y-auto">
          <RestScreen
            isSuperset={true}
            setNumber={supersetRound - 1}
            totalRounds={totalRounds}
            restDuration={restDuration}
            restTimeRemaining={restTimeRemaining}
            onTimerComplete={skipRest}
            onSkip={skipRest}
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

      const totalRounds = currentExercise.workoutItem?.rounds || 1;

      return (
        <div className="flex-1 px-4 py-4 overflow-y-auto">
          <TransitionScreen
            isSuperset={true}
            totalRounds={totalRounds}
            lastSetNumber={totalRounds}
            restDuration={restDuration}
            restTimeRemaining={restTimeRemaining}
            onTimerComplete={skipRest}
            onSkip={skipRest}
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
          workoutName={session.workout?.name || "Workout"}
          duration={duration}
          exercises={summaryExercises}
          onComplete={handleComplete}
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

      {/* Substitute exercise sheet */}
      <ExerciseSelector
        open={showSubstituteSheet}
        onOpenChange={setShowSubstituteSheet}
        mode="single"
        onSelect={handleConfirmSubstitute}
        title="Substituer l'exercice"
        initialMuscleGroups={
          nextExercise?.exercise.muscleGroups.filter(
            (g): g is MuscleGroup => typeof g === "string"
          ) || []
        }
        footerMessage="Substitution pour cette séance uniquement"
      />

      {/* Overview reorder exercises sheet */}
      <ReorderExercisesScreen
        open={showOverviewReorderScreen}
        onOpenChange={setShowOverviewReorderScreen}
        items={buildAllReorderItems()}
        onConfirm={handleOverviewConfirmReorder}
        isSubmitting={isSubmitting}
      />

      {/* Overview substitute exercise sheet */}
      <ExerciseSelector
        open={showOverviewSubstituteSheet}
        onOpenChange={setShowOverviewSubstituteSheet}
        mode="single"
        onSelect={handleOverviewConfirmSubstitute}
        title="Substituer l'exercice"
        initialMuscleGroups={
          activeExercises[0]?.exercise.muscleGroups.filter(
            (g): g is MuscleGroup => typeof g === "string"
          ) || []
        }
        footerMessage="Substitution pour cette séance uniquement"
      />
    </div>
  );
}
