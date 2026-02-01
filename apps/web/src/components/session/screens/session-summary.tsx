"use client";

import { useState, useCallback } from "react";
import { Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ResultInput } from "../result-input";
import {
  ProgressionSuggestionCard,
  type ProgressionSuggestion,
} from "../progression-suggestion-card";

export interface SummaryExercise {
  id: string;
  exerciseId: string; // The actual exercise ID (not sessionExercise ID)
  name: string;
  sets: Array<{
    id: string;
    setNumber: number;
    targetReps: number;
    targetWeight: number | null;
    actualReps: number | null;
    actualWeight: number | null;
  }>;
}

export interface SetModification {
  setId: string;
  reps: number;
  weight: number;
}

interface SessionSummaryProps {
  workoutName: string;
  duration: number; // in seconds
  exercises: SummaryExercise[];
  suggestions: Map<string, ProgressionSuggestion>; // keyed by exerciseId
  onComplete: (modifications: SetModification[]) => void;
  onAcceptSuggestion: (id: string) => Promise<void>;
  onDismissSuggestion: (id: string) => Promise<void>;
  isSubmitting?: boolean;
}

export function SessionSummary({
  workoutName,
  duration,
  exercises,
  suggestions,
  onComplete,
  onAcceptSuggestion,
  onDismissSuggestion,
  isSubmitting = false,
}: SessionSummaryProps) {
  // Local state for modifications (only tracks changes from original values)
  const [modifications, setModifications] = useState<Map<string, { reps: number; weight: number }>>(
    new Map()
  );

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (hours > 0) {
      return `${hours}h${minutes.toString().padStart(2, "0")}`;
    }
    return `${minutes} min`;
  };

  // Handle local set change
  const handleSetChange = useCallback(
    (setId: string, originalValue: { reps: number; weight: number }, newValue: { reps: number; weight: number }) => {
      setModifications((prev) => {
        const next = new Map(prev);
        // Only track if different from original
        if (newValue.reps !== originalValue.reps || newValue.weight !== originalValue.weight) {
          next.set(setId, newValue);
        } else {
          // Remove from modifications if back to original
          next.delete(setId);
        }
        return next;
      });
    },
    []
  );

  // Get current value for a set (modified or original)
  const getSetValue = useCallback(
    (set: SummaryExercise["sets"][number]) => {
      const modified = modifications.get(set.id);
      if (modified) return modified;
      return {
        reps: set.actualReps ?? set.targetReps,
        weight: set.actualWeight ?? set.targetWeight ?? 0,
      };
    },
    [modifications]
  );

  // Handle complete - send all modifications
  const handleComplete = useCallback(() => {
    const mods: SetModification[] = Array.from(modifications.entries()).map(([setId, value]) => ({
      setId,
      reps: value.reps,
      weight: value.weight,
    }));
    onComplete(mods);
  }, [modifications, onComplete]);

  // Filter to only show exercises with completed sets
  const completedExercises = exercises.filter((ex) =>
    ex.sets.some((s) => s.actualReps !== null)
  );

  return (
    <div className="flex flex-col h-full px-4 py-6 overflow-y-auto">
      {/* Header with trophy */}
      <div className="text-center space-y-3 mb-6">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-zinc-100/10 border border-zinc-100/20">
          <Trophy className="h-8 w-8 text-zinc-100" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Séance terminée !</h1>
          <p className="text-zinc-500 text-sm mt-1">
            {workoutName} • {formatDuration(duration)}
          </p>
        </div>
      </div>

      {/* Exercises recap */}
      <div className="flex-1 space-y-4 mb-6">
        {completedExercises.map((exercise) => (
          <ExerciseRecap
            key={exercise.id}
            exercise={exercise}
            suggestion={suggestions.get(exercise.exerciseId) || null}
            onAcceptSuggestion={onAcceptSuggestion}
            onDismissSuggestion={onDismissSuggestion}
            getSetValue={getSetValue}
            onSetChange={handleSetChange}
          />
        ))}
      </div>

      {/* Complete button */}
      <div className="sticky bottom-0 pt-4 bg-gradient-to-t from-zinc-950 via-zinc-950/95 to-transparent -mx-4 px-4 pb-2">
        <Button
          onClick={handleComplete}
          disabled={isSubmitting}
          size="xl"
          className="w-full"
        >
          {isSubmitting ? (
            <span className="flex items-center gap-2">
              <span className="animate-spin h-4 w-4 border-2 border-zinc-900/30 border-t-zinc-900 rounded-full" />
              Enregistrement...
            </span>
          ) : (
            "Terminer la séance"
          )}
        </Button>
      </div>
    </div>
  );
}

interface ExerciseRecapProps {
  exercise: SummaryExercise;
  suggestion: ProgressionSuggestion | null;
  onAcceptSuggestion: (id: string) => Promise<void>;
  onDismissSuggestion: (id: string) => Promise<void>;
  getSetValue: (set: SummaryExercise["sets"][number]) => { reps: number; weight: number };
  onSetChange: (setId: string, originalValue: { reps: number; weight: number }, newValue: { reps: number; weight: number }) => void;
}

function ExerciseRecap({
  exercise,
  suggestion,
  onAcceptSuggestion,
  onDismissSuggestion,
  getSetValue,
  onSetChange,
}: ExerciseRecapProps) {
  // Only show completed sets
  const completedSets = exercise.sets.filter((s) => s.actualReps !== null);

  if (completedSets.length === 0) return null;

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 overflow-hidden">
      {/* Exercise header */}
      <div className="px-4 py-3 border-b border-zinc-800/50">
        <h3 className="font-semibold text-zinc-100">{exercise.name}</h3>
        <p className="text-xs text-zinc-500 mt-0.5">
          {completedSets.length} série{completedSets.length > 1 ? "s" : ""} complétée{completedSets.length > 1 ? "s" : ""}
        </p>
      </div>

      {/* Sets list */}
      <div className="divide-y divide-zinc-800/50">
        {completedSets.map((set) => (
          <SetRow
            key={set.id}
            set={set}
            value={getSetValue(set)}
            onChange={(newValue) => {
              const originalValue = {
                reps: set.actualReps ?? set.targetReps,
                weight: set.actualWeight ?? set.targetWeight ?? 0,
              };
              onSetChange(set.id, originalValue, newValue);
            }}
          />
        ))}
      </div>

      {/* Progression suggestion */}
      {suggestion && (
        <ProgressionSuggestionCard
          suggestion={suggestion}
          onAccept={onAcceptSuggestion}
          onDismiss={onDismissSuggestion}
        />
      )}
    </div>
  );
}

interface SetRowProps {
  set: SummaryExercise["sets"][number];
  value: { reps: number; weight: number };
  onChange: (value: { reps: number; weight: number }) => void;
}

function SetRow({ set, value, onChange }: SetRowProps) {
  return (
    <div className="px-4 py-3">
      <div className="flex items-center gap-3">
        {/* Set number badge - white circle */}
        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-zinc-100 text-xs font-semibold text-zinc-900">
          {set.setNumber}
        </div>

        {/* Compact stepper controls */}
        <div className="flex-1">
          <ResultInput
            exerciseName=""
            targetReps={set.targetReps}
            targetWeight={set.targetWeight}
            value={value}
            onChange={onChange}
            showObjective={false}
            compact
            hideHeader
          />
        </div>
      </div>
    </div>
  );
}
