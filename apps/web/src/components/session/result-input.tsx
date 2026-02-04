"use client";

import { useState, useRef, useEffect } from "react";
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
  const [editingField, setEditingField] = useState<"reps" | "weight" | null>(null);
  const [editValue, setEditValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when editing starts
  useEffect(() => {
    if (editingField && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingField]);

  const handleRepsChange = (delta: number) => {
    const newReps = Math.max(0, Math.min(100, value.reps + delta));
    onChange({ ...value, reps: newReps });
  };

  const handleWeightChange = (delta: number) => {
    const newWeight = Math.max(0, Math.min(500, value.weight + delta));
    onChange({ ...value, weight: newWeight });
  };

  const startEditing = (field: "reps" | "weight") => {
    setEditingField(field);
    setEditValue(field === "reps" ? String(value.reps) : String(value.weight));
  };

  const commitEdit = () => {
    if (!editingField) return;

    const parsed = parseFloat(editValue);
    if (!isNaN(parsed)) {
      if (editingField === "reps") {
        const newReps = Math.max(0, Math.min(100, Math.round(parsed)));
        onChange({ ...value, reps: newReps });
      } else {
        // Allow 0.5 increments for weight
        const newWeight = Math.max(0, Math.min(500, Math.round(parsed * 2) / 2));
        onChange({ ...value, weight: newWeight });
      }
    }
    setEditingField(null);
    setEditValue("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      commitEdit();
    } else if (e.key === "Escape") {
      setEditingField(null);
      setEditValue("");
    }
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

            {/* Value display - clickable to edit */}
            {editingField === "reps" ? (
              <input
                ref={inputRef}
                type="number"
                inputMode="numeric"
                pattern="[0-9]*"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={commitEdit}
                onKeyDown={handleKeyDown}
                className={cn(
                  "text-center font-mono font-bold tabular-nums text-zinc-100",
                  "bg-zinc-800/80 border-x border-zinc-700/30",
                  "outline-hidden focus:ring-1 focus:ring-zinc-500",
                  "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
                  compact ? "h-10 w-12 text-xl" : "h-11 w-14 text-2xl"
                )}
              />
            ) : (
              <button
                type="button"
                onClick={() => startEditing("reps")}
                className={cn(
                  "flex items-center justify-center",
                  "bg-zinc-800/80 border-x border-zinc-700/30",
                  "[@media(hover:hover)]:hover:bg-zinc-700/60",
                  "transition-colors",
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
              </button>
            )}

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

            {/* Value display - clickable to edit */}
            {editingField === "weight" ? (
              <input
                ref={inputRef}
                type="number"
                inputMode="decimal"
                step="0.5"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={commitEdit}
                onKeyDown={handleKeyDown}
                className={cn(
                  "text-center font-mono font-bold tabular-nums text-zinc-100",
                  "bg-zinc-800/80 border-x border-zinc-700/30",
                  "outline-hidden focus:ring-1 focus:ring-zinc-500",
                  "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
                  compact ? "h-10 w-12 text-xl" : "h-11 w-14 text-2xl"
                )}
              />
            ) : (
              <button
                type="button"
                onClick={() => startEditing("weight")}
                className={cn(
                  "flex items-center justify-center",
                  "bg-zinc-800/80 border-x border-zinc-700/30",
                  "[@media(hover:hover)]:hover:bg-zinc-700/60",
                  "transition-colors",
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
              </button>
            )}

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
