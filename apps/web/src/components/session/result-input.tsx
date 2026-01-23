"use client";

import { cn } from "@/lib/utils";

interface ResultInputProps {
  exerciseName: string;
  setNumber?: number;
  targetReps: number;
  targetWeight: number | null;
  value: { reps: number; weight: number };
  onChange: (value: { reps: number; weight: number }) => void;
  showObjective?: boolean;
  compact?: boolean;
  hideHeader?: boolean;
}

export function ResultInput({
  exerciseName,
  setNumber,
  targetReps,
  targetWeight,
  value,
  onChange,
  showObjective = true,
  compact = false,
  hideHeader = false,
}: ResultInputProps) {
  const handleRepsChange = (delta: number) => {
    const newReps = Math.max(0, Math.min(100, value.reps + delta));
    onChange({ ...value, reps: newReps });
  };

  const handleWeightChange = (delta: number) => {
    const newWeight = Math.max(0, Math.min(500, value.weight + delta));
    onChange({ ...value, weight: newWeight });
  };


  return (
    <div className={cn("w-full", compact && !hideHeader ? "py-2" : hideHeader ? "py-0" : "py-4")}>
      {/* Header */}
      {!hideHeader && (
        <div className={cn("text-center", compact ? "mb-3" : "mb-5")}>
          {setNumber !== undefined ? (
            <h3
              className={cn(
                "font-semibold tracking-wide text-zinc-100",
                compact ? "text-sm" : "text-base"
              )}
            >
              {compact ? exerciseName : `SÉRIE ${setNumber} TERMINÉE`}
            </h3>
          ) : (
            <h3
              className={cn(
                "font-semibold tracking-wide text-zinc-100",
                compact ? "text-sm" : "text-base"
              )}
            >
              {exerciseName}
            </h3>
          )}

          {showObjective && (
            <p className="text-xs text-zinc-500 mt-1">
              Objectif : {targetReps} reps @ {targetWeight ?? 0}kg
            </p>
          )}
        </div>
      )}

      {/* Steppers row */}
      <div className="flex items-stretch justify-center gap-3">
        {/* Reps stepper */}
        <div className="flex flex-col items-center">
          <div
            className={cn(
              "flex items-center rounded-xl overflow-hidden",
              "bg-zinc-800/40 border border-zinc-700/50"
            )}
          >
            {/* Minus button */}
            <button
              onClick={() => handleRepsChange(-1)}
              disabled={value.reps <= 0}
              className={cn(
                "flex items-center justify-center",
                "text-zinc-400 font-medium text-base",
                "[@media(hover:hover)]:hover:bg-zinc-700/50 [@media(hover:hover)]:hover:text-zinc-100",
                "disabled:opacity-30 disabled:cursor-not-allowed",
                "transition-all active:scale-95",
                compact ? "h-10 w-9" : "h-11 w-10"
              )}
            >
              −
            </button>

            {/* Value display */}
            <div
              className={cn(
                "flex items-center justify-center",
                "bg-zinc-800/80 border-x border-zinc-700/30",
                compact ? "h-10 w-12" : "h-11 w-14"
              )}
            >
              <span
                className={cn(
                  "font-mono font-bold tabular-nums text-zinc-100",
                  compact ? "text-xl" : "text-2xl"
                )}
              >
                {value.reps}
              </span>
            </div>

            {/* Plus button */}
            <button
              onClick={() => handleRepsChange(1)}
              disabled={value.reps >= 100}
              className={cn(
                "flex items-center justify-center",
                "text-zinc-400 font-medium text-base",
                "[@media(hover:hover)]:hover:bg-zinc-700/50 [@media(hover:hover)]:hover:text-zinc-100",
                "disabled:opacity-30 disabled:cursor-not-allowed",
                "transition-all active:scale-95",
                compact ? "h-10 w-9" : "h-11 w-10"
              )}
            >
              +
            </button>
          </div>
          <span className="text-[11px] text-zinc-500 mt-2 uppercase tracking-wider">
            reps
          </span>
        </div>

        {/* Weight stepper - always show */}
        <div className="flex flex-col items-center">
          <div
            className={cn(
              "flex items-center rounded-xl overflow-hidden",
              "bg-zinc-800/40 border border-zinc-700/50"
            )}
          >
            {/* Minus button */}
            <button
              onClick={() => handleWeightChange(-0.5)}
              disabled={value.weight <= 0}
              className={cn(
                "flex items-center justify-center",
                "text-zinc-400 font-medium text-base",
                "[@media(hover:hover)]:hover:bg-zinc-700/50 [@media(hover:hover)]:hover:text-zinc-100",
                "disabled:opacity-30 disabled:cursor-not-allowed",
                "transition-all active:scale-95",
                compact ? "h-10 w-9" : "h-11 w-10"
              )}
            >
              −
            </button>

            {/* Value display */}
            <div
              className={cn(
                "flex items-center justify-center",
                "bg-zinc-800/80 border-x border-zinc-700/30",
                compact ? "h-10 w-12" : "h-11 w-14"
              )}
            >
              <span
                className={cn(
                  "font-mono font-bold tabular-nums text-zinc-100",
                  compact ? "text-xl" : "text-2xl"
                )}
              >
                {value.weight}
              </span>
            </div>

            {/* Plus button */}
            <button
              onClick={() => handleWeightChange(0.5)}
              disabled={value.weight >= 500}
              className={cn(
                "flex items-center justify-center",
                "text-zinc-400 font-medium text-base",
                "[@media(hover:hover)]:hover:bg-zinc-700/50 [@media(hover:hover)]:hover:text-zinc-100",
                "disabled:opacity-30 disabled:cursor-not-allowed",
                "transition-all active:scale-95",
                compact ? "h-10 w-9" : "h-11 w-10"
              )}
            >
              +
            </button>
          </div>
          <span className="text-[11px] text-zinc-500 mt-2 uppercase tracking-wider">
            kg
          </span>
        </div>
      </div>
    </div>
  );
}
