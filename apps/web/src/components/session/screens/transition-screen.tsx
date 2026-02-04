"use client";

import { useState, useEffect } from "react";
import { Check } from "lucide-react";
import { TimerBlock } from "../timer-block";
import { ResultInput } from "../result-input";
import { NextPreview, type SupersetPreviewData } from "../next-preview";
import { ExerciseOptionsBar } from "../exercise-options-bar";

interface ExerciseResult {
  id: string;
  exerciseName: string;
  targetReps: number;
  targetWeight: number | null;
  value: { reps: number; weight: number };
}

// Props for standard exercise mode
interface StandardTransitionProps {
  isSuperset?: false;
  completedExerciseName: string;
  lastSetNumber: number;
  targetReps: number;
  targetWeight: number | null;
  defaultReps: number;
  defaultWeight: number;
  onResultChange: (value: { reps: number; weight: number }) => void;
  exercises?: never;
  onSupersetResultChange?: never;
  totalRounds?: never;
}

// Props for superset mode
interface SupersetTransitionProps {
  isSuperset: true;
  exercises: ExerciseResult[];
  onSupersetResultChange: (exerciseId: string, value: { reps: number; weight: number }) => void;
  lastSetNumber: number;
  totalRounds: number;
  completedExerciseName?: never;
  targetReps?: never;
  targetWeight?: never;
  defaultReps?: never;
  defaultWeight?: never;
  onResultChange?: never;
}

// Common props for both modes
interface CommonTransitionProps {
  // Timer props
  restDuration: number;
  restTimeRemaining: number;
  onTimerComplete: () => void;
  onSkip: () => void;
  onAdjust: (delta: number) => void;
  // Next exercise preview props (optional)
  nextExercise?: {
    name: string;
    muscleGroups: string[];
    totalSets: number;
    firstSetTarget: { reps: number; weight: number | null };
    lastFirstSet?: { reps: number | null; weight: number | null } | null;
  } | null;
  // Next superset preview props (mutually exclusive with nextExercise)
  nextSuperset?: SupersetPreviewData | null;
  // Options bar props (optional - not shown when no next exercise)
  onSkipExercise?: () => void;
  onPostponeExercise?: () => void;
  onSubstituteExercise?: () => void;
}

type TransitionScreenProps = CommonTransitionProps & (StandardTransitionProps | SupersetTransitionProps);

export function TransitionScreen(props: TransitionScreenProps) {
  const {
    restDuration,
    restTimeRemaining,
    onTimerComplete,
    onSkip,
    onAdjust,
    lastSetNumber,
    nextExercise,
    nextSuperset,
    onSkipExercise,
    onPostponeExercise,
    onSubstituteExercise,
  } = props;

  const hasNextItem = nextExercise || nextSuperset;
  const isNextSuperset = !!nextSuperset;

  // State for standard mode
  const [standardResult, setStandardResult] = useState(
    !props.isSuperset
      ? { reps: props.defaultReps, weight: props.defaultWeight }
      : { reps: 0, weight: 0 }
  );

  // State for superset mode
  const [supersetResults, setSupersetResults] = useState<Map<string, { reps: number; weight: number }>>(
    props.isSuperset
      ? new Map(props.exercises.map((ex) => [ex.id, ex.value]))
      : new Map()
  );

  // Update parent when standard result changes
  useEffect(() => {
    if (!props.isSuperset && props.onResultChange) {
      props.onResultChange(standardResult);
    }
  }, [standardResult, props.isSuperset]);

  // Update superset results when exercises change
  useEffect(() => {
    if (props.isSuperset) {
      setSupersetResults(new Map(props.exercises.map((ex) => [ex.id, ex.value])));
    }
  }, [props.isSuperset ? props.exercises : null]);

  const handleSupersetResultChange = (exerciseId: string, value: { reps: number; weight: number }) => {
    if (!props.isSuperset) return;
    const newResults = new Map(supersetResults);
    newResults.set(exerciseId, value);
    setSupersetResults(newResults);
    props.onSupersetResultChange(exerciseId, value);
  };

  return (
    <div className="flex flex-col h-full space-y-4 overflow-y-auto">
      {/* Header */}
      <div className="text-center shrink-0 mb-2">
        <div className="flex items-center justify-center gap-2 text-green-400 mb-1">
          <Check className="h-5 w-5" />
          <span className="text-sm font-semibold uppercase tracking-wider">
            {props.isSuperset ? "Superset terminé" : "Exercice terminé"}
          </span>
        </div>
        {/* Exercise name only for standard mode */}
        {!props.isSuperset && (
          <h1 className="text-2xl font-bold text-zinc-100">{props.completedExerciseName}</h1>
        )}
      </div>

      {/* Timer */}
      <div className="shrink-0">
        <TimerBlock
          duration={restDuration}
          timeRemaining={restTimeRemaining}
          onComplete={onTimerComplete}
          onSkip={onSkip}
          onAdjust={onAdjust}
          label="REPOS"
        />
      </div>

      {/* Result input section */}
      {props.isSuperset ? (
        // Superset mode: multiple result inputs
        <div className="space-y-2">
          {/* Series header */}
          <div className="text-center mb-4">
            <h3 className="font-semibold tracking-wide text-zinc-100 text-base">
              SÉRIE {lastSetNumber} TERMINÉE
            </h3>
          </div>

          {/* Multiple result inputs with exercise name as subtitle */}
          {props.exercises.map((exercise) => (
            <ResultInput
              key={exercise.id}
              exerciseName={exercise.exerciseName}
              targetReps={exercise.targetReps}
              targetWeight={exercise.targetWeight}
              value={supersetResults.get(exercise.id) || exercise.value}
              onChange={(value) => handleSupersetResultChange(exercise.id, value)}
              showObjective={true}
              compact={true}
            />
          ))}
        </div>
      ) : (
        // Standard mode: single result input
        <ResultInput
          exerciseName={props.completedExerciseName}
          setNumber={lastSetNumber}
          targetReps={props.targetReps}
          targetWeight={props.targetWeight}
          value={standardResult}
          onChange={setStandardResult}
          showObjective={true}
        />
      )}

      {/* Separator */}
      <div className="flex items-center h-4 mt-2! mb-2!">
        <div className="h-px w-full bg-linear-to-r from-transparent via-zinc-700 to-transparent" />
      </div>

      {/* Next item preview or end message */}
      {hasNextItem ? (
        <>
          <div className="shrink-0">
            {isNextSuperset && nextSuperset ? (
              <NextPreview type="superset" supersetData={nextSuperset} />
            ) : nextExercise ? (
              <NextPreview type="exercise" exerciseData={nextExercise} />
            ) : null}
          </div>

          {/* Options bar */}
          {onSkipExercise && onPostponeExercise && onSubstituteExercise && (
            <div className="shrink-0 mt-auto">
              <ExerciseOptionsBar
                onSkip={onSkipExercise}
                onPostpone={onPostponeExercise}
                onSubstitute={onSubstituteExercise}
              />
            </div>
          )}
        </>
      ) : (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-4 text-center">
          <p className="text-sm text-zinc-400">Aucun autre exercice, séance terminée !</p>
        </div>
      )}
    </div>
  );
}
