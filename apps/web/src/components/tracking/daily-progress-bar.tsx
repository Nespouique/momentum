"use client";

import { TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface DailyProgress {
  completed: number;
  total: number;
  percentage: number;
}

interface DailyProgressBarProps {
  progress: DailyProgress;
}

export function DailyProgressBar({ progress }: DailyProgressBarProps) {
  const percentageDisplay = Math.round(progress.percentage);
  const progressWidth = Math.min(progress.percentage, 100);

  // Color gradient based on completion
  const getGradientColors = () => {
    if (percentageDisplay >= 100) return "from-emerald-500 to-green-500";
    if (percentageDisplay >= 75) return "from-blue-500 to-cyan-500";
    if (percentageDisplay >= 50) return "from-amber-500 to-yellow-500";
    return "from-orange-500 to-red-500";
  };

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border/40 bg-card p-5 shadow-sm">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
            <TrendingUp className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-bold tracking-tight">
              Progrès du jour
            </h3>
            <p className="text-xs text-muted-foreground/70">
              {progress.completed} / {progress.total} objectifs
            </p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold tabular-nums tracking-tight">
            {percentageDisplay}
            <span className="text-lg text-muted-foreground">%</span>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="relative h-3 overflow-hidden rounded-full bg-secondary/30">
        <div
          className={cn(
            "h-full rounded-full bg-gradient-to-r shadow-sm transition-all duration-1000 ease-out",
            getGradientColors()
          )}
          style={{ width: `${progressWidth}%` }}
        >
          {/* Shimmer effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
        </div>

        {/* Glow effect when complete */}
        {percentageDisplay >= 100 && (
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-400/30 to-green-400/30 blur-md animate-pulse" />
        )}
      </div>

      {/* Completion message */}
      {percentageDisplay >= 100 && (
        <p className="mt-3 text-center text-xs font-semibold text-emerald-500 dark:text-emerald-400">
          🎉 Tous les objectifs complétés !
        </p>
      )}
    </div>
  );
}
