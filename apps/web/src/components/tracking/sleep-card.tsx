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
    <div className="relative overflow-hidden rounded-xl border border-border/40 bg-card p-4">
      <div className="absolute inset-0 bg-linear-to-br from-violet-500/20 to-transparent opacity-50" />

      <div className="relative">
        <div className="flex items-center gap-2 mb-2">
          <Moon className="h-4 w-4 text-violet-400" />
          <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Sommeil
          </span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold tabular-nums tracking-tight">
            {formatDuration(sleep.value)}
          </span>
          {hasGoal && (
            <>
              <span className="text-sm text-muted-foreground">
                / {formatDuration(sleep.goal!)}
              </span>
              <span className="text-sm text-muted-foreground font-semibold">
                ({Math.round(sleep.percentage!)}%)
              </span>
            </>
          )}
        </div>

        {/* Progress bar */}
        {hasGoal && (
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-violet-500/10">
            <div
              className="h-full rounded-full bg-violet-400 transition-all duration-1000 ease-out"
              style={{ width: `${progressWidth}%` }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
