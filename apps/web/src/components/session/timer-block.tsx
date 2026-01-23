"use client";

import { useEffect, useCallback } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface TimerBlockProps {
  duration: number; // Total duration in seconds
  timeRemaining: number; // Current time remaining
  onComplete?: () => void;
  onSkip: () => void;
  onAdjust: (delta: number) => void;
  autoStart?: boolean;
  label?: string;
}

export function TimerBlock({
  duration,
  timeRemaining,
  onComplete,
  onSkip,
  onAdjust,
  label = "REPOS",
}: TimerBlockProps) {
  const minutes = Math.floor(timeRemaining / 60);
  const seconds = timeRemaining % 60;
  const progress = duration > 0 ? ((duration - timeRemaining) / duration) * 100 : 0;

  const isUrgent = timeRemaining <= 5 && timeRemaining > 0;
  const isComplete = timeRemaining === 0;

  // Format time as MM:SS
  const formattedTime = `${minutes}:${seconds.toString().padStart(2, "0")}`;

  // Circular progress calculations
  const size = 220;
  const strokeWidth = 6;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  // Handle completion
  useEffect(() => {
    if (timeRemaining === 0 && onComplete) {
      onComplete();
    }
  }, [timeRemaining, onComplete]);

  const handleAdjust = useCallback(
    (delta: number) => {
      onAdjust(delta);
    },
    [onAdjust]
  );

  return (
    <div className="w-full flex flex-col items-center">
      {/* Circular timer */}
      <div className="relative" style={{ width: size, height: size }}>
        {/* SVG Progress Ring */}
        <svg
          className="absolute inset-0 -rotate-90"
          width={size}
          height={size}
        >
          {/* Background track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-zinc-800"
          />
          {/* Progress arc - gradient for normal, solid for urgent */}
          <defs>
            <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" style={{ stopColor: "#a1a1aa" }} />
              <stop offset="100%" style={{ stopColor: "#ffffff" }} />
            </linearGradient>
          </defs>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={isUrgent || isComplete ? "#dc2626" : "url(#progressGradient)"}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-1000 ease-linear"
          />
        </svg>

        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {/* Label */}
          <span className="text-[10px] font-semibold tracking-[0.2em] text-zinc-500 uppercase mb-1">
            {label}
          </span>

          {/* Time */}
          <span
            className={cn(
              "font-mono text-5xl font-bold tabular-nums tracking-tight",
              "transition-colors duration-300",
              isUrgent && "text-red-600",
              isComplete && "text-red-600",
              !isUrgent && !isComplete && "text-zinc-100"
            )}
          >
            {formattedTime}
          </span>

          {/* Action buttons */}
          <div className="flex items-center gap-3 mt-4">
            {/* +30s button */}
            <button
              onClick={() => handleAdjust(30)}
              className={cn(
                "flex items-center justify-center",
                "h-9 w-9 rounded-full",
                "text-xs font-medium text-zinc-400",
                "bg-zinc-800/80 border border-zinc-700/50",
                "hover:bg-zinc-700/80 hover:text-zinc-100 hover:border-zinc-600",
                "transition-all active:scale-95"
              )}
            >
              +30
            </button>

            {/* Skip button */}
            <button
              onClick={onSkip}
              className={cn(
                "flex items-center justify-center",
                "h-9 w-9 rounded-full",
                "bg-zinc-100 text-zinc-900",
                "hover:bg-white",
                "transition-all active:scale-95"
              )}
            >
              <Check className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
