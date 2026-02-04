"use client";

import { useState, useEffect } from "react";
import { TimerBlock } from "../timer-block";
import { ResultInput } from "../result-input";
import { NextPreview } from "../next-preview";

interface ExerciseResult {
  id: string;
  exerciseName: string;
  targetReps: number;
  targetWeight: number | null;
  value: { reps: number; weight: number };
}

// Props for standard exercise mode
interface StandardRestProps {
  isSuperset?: false;
  exerciseName: string;
  setNumber: number;
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
interface SupersetRestProps {
  isSuperset: true;
  exercises: ExerciseResult[];
  onSupersetResultChange: (exerciseId: string, value: { reps: number; weight: number }) => void;
  setNumber: number;
  totalRounds: number;
  exerciseName?: never;
  targetReps?: never;
  targetWeight?: never;
  defaultReps?: never;
  defaultWeight?: never;
  onResultChange?: never;
}

// Common props for both modes
interface CommonRestProps {
  // Timer props
  restDuration: number;
  restTimeRemaining: number;
  onTimerComplete: () => void;
  onSkip: () => void;
  onAdjust: (delta: number) => void;
  // Next set preview props (optional - not shown on last set)
  nextSetNumber?: number;
  nextTotalSets?: number;
  nextTargetReps?: number;
  nextTargetWeight?: number | null;
  lastReps?: number | null;
  lastWeight?: number | null;
}

type RestScreenProps = CommonRestProps & (StandardRestProps | SupersetRestProps);

export function RestScreen(props: RestScreenProps) {
  const {
    restDuration,
    restTimeRemaining,
    onTimerComplete,
    onSkip,
    onAdjust,
    setNumber,
    nextSetNumber,
    nextTotalSets,
    nextTargetReps,
    nextTargetWeight,
    lastReps,
    lastWeight,
  } = props;

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

  // Reset standard result when set changes (no auto-notify parent)
  useEffect(() => {
    if (!props.isSuperset) {
      setStandardResult({ reps: props.defaultReps, weight: props.defaultWeight });
    }
  }, [setNumber, props.isSuperset, props.defaultReps, props.defaultWeight]);

  // Handle standard result change - only notify parent when user actually changes value
  const handleStandardResultChange = (value: { reps: number; weight: number }) => {
    setStandardResult(value);
    if (!props.isSuperset && props.onResultChange) {
      props.onResultChange(value);
    }
  };

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

  const hasNextSet = nextSetNumber !== undefined && nextTotalSets !== undefined && nextTargetReps !== undefined;

  return (
    <div className="flex flex-col h-full space-y-4 overflow-y-auto">
      {/* Header - Exercise name for standard mode, "Superset" in purple for superset */}
      <div className="text-center shrink-0 mb-2">
        {!props.isSuperset && (
          <h1 className="text-2xl font-bold text-zinc-100">{props.exerciseName}</h1>
        )}
        {props.isSuperset && (
          <h1 className="text-2xl font-bold text-purple-400">Superset</h1>
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
              SÉRIE {setNumber} TERMINÉE
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
          exerciseName={props.exerciseName}
          setNumber={setNumber}
          targetReps={props.targetReps}
          targetWeight={props.targetWeight}
          value={standardResult}
          onChange={handleStandardResultChange}
          showObjective={true}
        />
      )}

      {/* Separator */}
      <div className="flex items-center h-4 mt-2! mb-2!">
        <div className="h-px w-full bg-linear-to-r from-transparent via-zinc-700 to-transparent" />
      </div>

      {/* Next set preview or end message */}
      {hasNextSet ? (
        <NextPreview
          type="set"
          setData={{
            setNumber: nextSetNumber,
            totalSets: nextTotalSets,
            targetReps: nextTargetReps,
            targetWeight: nextTargetWeight ?? null,
            lastReps,
            lastWeight,
          }}
        />
      ) : (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-4 text-center">
          <p className="text-sm text-zinc-400">
            {props.isSuperset ? "Dernière série du superset !" : "Aucun autre exercice, séance terminée !"}
          </p>
        </div>
      )}
    </div>
  );
}
