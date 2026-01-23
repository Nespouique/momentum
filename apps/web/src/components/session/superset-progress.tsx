"use client";

import { Check, Circle, Repeat } from "lucide-react";
import { cn } from "@/lib/utils";

interface SupersetExercise {
  id: string;
  name: string;
  status: "done" | "current" | "pending";
}

interface SupersetProgressProps {
  currentRound: number;
  totalRounds: number;
  exercises: SupersetExercise[];
}

export function SupersetProgress({
  currentRound,
  totalRounds,
  exercises,
}: SupersetProgressProps) {
  return (
    <div className="rounded-xl border border-purple-500/30 bg-purple-500/5 p-4">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <Repeat className="h-4 w-4 text-purple-400" />
        <span className="text-sm font-semibold text-purple-300 uppercase tracking-wider">
          Superset · Tour {currentRound}/{totalRounds}
        </span>
      </div>

      {/* Divider */}
      <div className="h-px bg-purple-500/20 mb-3" />

      {/* Exercise list */}
      <div className="space-y-2">
        {exercises.map((exercise) => (
          <div
            key={exercise.id}
            className={cn(
              "flex items-center gap-2.5 py-1",
              exercise.status === "current" && "text-zinc-100",
              exercise.status === "done" && "text-zinc-500",
              exercise.status === "pending" && "text-zinc-600"
            )}
          >
            {/* Status icon */}
            {exercise.status === "done" && (
              <Check className="h-4 w-4 text-green-500 shrink-0" />
            )}
            {exercise.status === "current" && (
              <div className="relative shrink-0">
                <Circle className="h-4 w-4 text-purple-400 fill-purple-400" />
                <div className="absolute inset-0 animate-ping">
                  <Circle className="h-4 w-4 text-purple-400 opacity-50" />
                </div>
              </div>
            )}
            {exercise.status === "pending" && (
              <Circle className="h-4 w-4 text-zinc-600 shrink-0" />
            )}

            {/* Exercise name */}
            <span
              className={cn(
                "text-sm truncate",
                exercise.status === "current" && "font-medium"
              )}
            >
              {exercise.name}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
