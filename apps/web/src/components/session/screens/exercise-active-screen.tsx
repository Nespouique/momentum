"use client";

import { Repeat, Weight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MuscleGroupBadge } from "@/components/exercises";
import { SupersetProgress } from "../superset-progress";
import { MuscleGroup } from "@/lib/constants/muscle-groups";
import { cn } from "@/lib/utils";

interface ExerciseActiveScreenProps {
  exerciseName: string;
  muscleGroups: string[];
  currentSet: number;
  totalSets: number;
  targetReps: number;
  targetWeight: number | null;
  lastReps?: number | null;
  lastWeight?: number | null;
  onSetComplete: () => void;
  // Superset props
  isSuperset?: boolean;
  supersetRound?: number;
  supersetTotalRounds?: number;
  supersetExercises?: Array<{ id: string; name: string; status: "done" | "current" | "pending" }>;
}

export function ExerciseActiveScreen({
  exerciseName,
  muscleGroups,
  currentSet,
  totalSets,
  targetReps,
  targetWeight,
  lastReps,
  lastWeight,
  onSetComplete,
  isSuperset = false,
  supersetRound = 1,
  supersetTotalRounds = 1,
  supersetExercises = [],
}: ExerciseActiveScreenProps) {
  return (
    <div className="flex flex-col h-full">
      {/* Superset progress (if applicable) */}
      {isSuperset && supersetExercises.length > 0 && (
        <div className="mb-4">
          <SupersetProgress
            currentRound={supersetRound}
            totalRounds={supersetTotalRounds}
            exercises={supersetExercises}
          />
        </div>
      )}

      {/* Exercise info */}
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold text-zinc-100 mb-2">{exerciseName}</h1>
        <div className="flex flex-wrap justify-center gap-1.5">
          {[...muscleGroups]
            .sort((a, b) => a.localeCompare(b, "fr"))
            .map((group) => (
              <MuscleGroupBadge key={group} group={group as MuscleGroup} size="sm" />
            ))}
        </div>
      </div>

      {/* Set progress */}
      <div className="flex flex-col items-center mb-6">
        <div className="text-sm text-zinc-500 mb-2">
          Série {currentSet} / {totalSets}
        </div>
        <div className="flex gap-1.5">
          {Array.from({ length: totalSets }).map((_, i) => (
            <div
              key={i}
              className={cn(
                "w-3 h-3 rounded-full transition-all",
                i < currentSet - 1 && "bg-green-500",
                i === currentSet - 1 && "bg-zinc-100",
                i > currentSet - 1 && "bg-zinc-700"
              )}
            />
          ))}
        </div>
      </div>

      {/* Target block - Primary focus */}
      <div className="rounded-xl border border-zinc-700/50 bg-zinc-800/60 p-5 mb-4">
        <div className="flex items-center justify-center gap-8">
          {/* Reps */}
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-700/50">
              <Repeat className="h-5 w-5 text-zinc-300" />
            </div>
            <div>
              <div className="text-3xl font-bold text-zinc-100">{targetReps}</div>
              <div className="text-xs text-zinc-500 uppercase tracking-wider">reps</div>
            </div>
          </div>

          {/* Weight - always show, display dash if no target */}
          <div className="h-10 w-px bg-zinc-700" />
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-700/50">
              <Weight className="h-5 w-5 text-zinc-300" />
            </div>
            <div>
              <div className="text-3xl font-bold text-zinc-100">
                {targetWeight !== null ? targetWeight : "—"}
              </div>
              <div className="text-xs text-zinc-500 uppercase tracking-wider">kg</div>
            </div>
          </div>
        </div>
      </div>

      {/* Last time - Secondary info */}
      {(lastReps !== null && lastReps !== undefined) && (
        <div className="flex items-center justify-center gap-2 text-sm text-zinc-500">
          <span className="text-zinc-600">Dernière fois :</span>
          <span className="text-zinc-400">{lastReps} reps</span>
          {lastWeight !== null && lastWeight !== undefined && (
            <>
              <span className="text-zinc-700">·</span>
              <span className="text-zinc-400">{lastWeight} kg</span>
            </>
          )}
        </div>
      )}

      {/* Spacer */}
      <div className="flex-1 min-h-12" />

      {/* Complete button */}
      <Button
        onClick={onSetComplete}
        size="xl"
      >
        Série terminée
      </Button>
    </div>
  );
}
