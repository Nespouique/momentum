"use client";

import { Dumbbell } from "lucide-react";

interface WorkoutSessionsSummary {
  today: number;
  thisWeek: number;
  thisMonth: number;
  goal: {
    targetValue: number;
    frequency: "weekly" | "monthly";
  } | null;
}

interface WorkoutSummaryCardProps {
  sessions: WorkoutSessionsSummary;
}

function formatFrequencyLabel(frequency: string): string {
  return frequency === "monthly" ? "ce mois" : "cette sem.";
}

export function WorkoutSummaryCard({ sessions }: WorkoutSummaryCardProps) {
  const hasGoal = sessions.goal !== null;
  const goalPeriod = sessions.goal?.frequency || "weekly";
  const currentCount = goalPeriod === "weekly" ? sessions.thisWeek : sessions.thisMonth;
  const percentage = hasGoal ? Math.round((currentCount / sessions.goal!.targetValue) * 100) : 0;
  const progressWidth = hasGoal ? Math.min(percentage, 100) : 0;

  return (
    <div className="relative overflow-hidden rounded-xl border border-border/40 bg-card p-4">
      <div className="absolute inset-0 bg-linear-to-br from-amber-500/20 to-transparent opacity-50" />

      <div className="relative">
        <div className="flex items-center gap-2 mb-2">
          <Dumbbell className="h-4 w-4 text-amber-400" />
          <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Sport
          </span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold tabular-nums tracking-tight">
            {currentCount}
          </span>
          <span className="text-sm text-muted-foreground">
            séance{currentCount !== 1 ? "s" : ""}
          </span>
          {hasGoal && (
            <>
              <span className="text-sm text-muted-foreground">
                / {sessions.goal!.targetValue}
              </span>
              <span className="text-sm text-muted-foreground font-semibold">
                ({percentage}%)
              </span>
            </>
          )}
        </div>
        {hasGoal && (
          <div className="flex items-center justify-between mt-1">
            <span className="text-[10px] text-muted-foreground/60">
              {formatFrequencyLabel(goalPeriod)}
            </span>
          </div>
        )}

        {/* Progress bar */}
        {hasGoal && (
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-amber-500/10">
            <div
              className="h-full rounded-full bg-amber-400 transition-all duration-1000 ease-out"
              style={{ width: `${progressWidth}%` }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
