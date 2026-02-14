"use client";

import { Moon } from "lucide-react";

interface SleepData {
  value: number; // minutes
  goal: number | null; // minutes, null if no goal
  percentage: number | null;
  trackableId: string;
}

interface SleepCardProps {
  sleep: SleepData;
}

function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h${mins.toString().padStart(2, "0")}`;
}

export function SleepCard({ sleep }: SleepCardProps) {
  const hasGoal = sleep.goal !== null && sleep.percentage !== null;
  const progressWidth = hasGoal ? Math.min(sleep.percentage!, 100) : 0;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-500/10 via-purple-500/5 to-indigo-500/10 p-4 shadow-sm backdrop-blur-sm">
      {/* Ambient glow */}
      <div className="absolute inset-0 bg-gradient-to-br from-violet-400/5 via-transparent to-purple-400/5 opacity-50" />

      {/* Content */}
      <div className="relative">
        <div className="flex items-center gap-4">
          {/* Icon */}
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-violet-500/15 ring-1 ring-violet-400/20 shadow-lg shadow-violet-500/10">
            <Moon className="h-5 w-5 text-violet-400" />
          </div>

          {/* Data */}
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold tabular-nums tracking-tight text-violet-100">
                {formatDuration(sleep.value)}
              </span>
              {hasGoal && (
                <>
                  <span className="text-sm text-violet-300/60 font-medium">
                    / {formatDuration(sleep.goal!)}
                  </span>
                  <span className="text-sm text-violet-300/80 font-semibold">
                    ({Math.round(sleep.percentage!)}%)
                  </span>
                </>
              )}
            </div>
            <p className="text-xs text-violet-200/50 font-medium tracking-wide mt-0.5">
              Durée de sommeil
            </p>
          </div>
        </div>

        {/* Progress bar */}
        {hasGoal && (
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-violet-950/30">
            <div
              className="h-full rounded-full bg-gradient-to-r from-violet-400 to-purple-400 shadow-sm shadow-violet-400/50 transition-all duration-1000 ease-out"
              style={{ width: `${progressWidth}%` }}
            />
          </div>
        )}
      </div>

      {/* Subtle top highlight */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-400/30 to-transparent" />
    </div>
  );
}
