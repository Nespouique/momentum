"use client";

import { Dumbbell, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

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
  onStartSession: () => void;
}

function formatFrequency(frequency: string): string {
  const map: Record<string, string> = {
    weekly: "cette semaine",
    monthly: "ce mois",
  };
  return map[frequency] || frequency;
}

export function WorkoutSummaryCard({
  sessions,
  onStartSession,
}: WorkoutSummaryCardProps) {
  const hasGoal = sessions.goal !== null;
  const goalPeriod = sessions.goal?.frequency || "weekly";
  const currentCount =
    goalPeriod === "weekly" ? sessions.thisWeek : sessions.thisMonth;
  const isGoalMet = hasGoal && currentCount >= sessions.goal!.targetValue;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-yellow-500/10 p-5 shadow-sm">
      {/* Ambient energy glow */}
      <div className="absolute inset-0 bg-gradient-to-br from-orange-400/5 via-transparent to-amber-400/5 opacity-60" />

      {/* Content */}
      <div className="relative space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/15 ring-1 ring-amber-400/25 shadow-sm">
            <Dumbbell className="h-5 w-5 text-amber-500" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-bold text-foreground tracking-tight">
              Sport
            </h3>
            <p className="text-xs text-muted-foreground/70 mt-0.5">
              Séances d'entraînement
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="flex flex-col items-center rounded-lg bg-background/40 py-2 px-1 backdrop-blur-sm">
            <span className="text-xl font-bold tabular-nums text-amber-500">
              {sessions.today}
            </span>
            <span className="text-[10px] text-muted-foreground/60 font-medium uppercase tracking-wider mt-0.5">
              Aujourd'hui
            </span>
          </div>
          <div className="flex flex-col items-center rounded-lg bg-background/40 py-2 px-1 backdrop-blur-sm">
            <span className="text-xl font-bold tabular-nums text-amber-500">
              {sessions.thisWeek}
            </span>
            <span className="text-[10px] text-muted-foreground/60 font-medium uppercase tracking-wider mt-0.5">
              Semaine
            </span>
          </div>
          <div className="flex flex-col items-center rounded-lg bg-background/40 py-2 px-1 backdrop-blur-sm">
            <span className="text-xl font-bold tabular-nums text-amber-500">
              {sessions.thisMonth}
            </span>
            <span className="text-[10px] text-muted-foreground/60 font-medium uppercase tracking-wider mt-0.5">
              Mois
            </span>
          </div>
        </div>

        {/* Goal */}
        {hasGoal && (
          <div className="flex items-center justify-between rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2">
            <div className="flex items-baseline gap-1.5">
              <span className="text-sm font-bold tabular-nums text-amber-600 dark:text-amber-400">
                {currentCount}
              </span>
              <span className="text-xs text-muted-foreground">
                / {sessions.goal!.targetValue}
              </span>
              <span className="text-xs text-muted-foreground/70">
                {formatFrequency(goalPeriod)}
              </span>
            </div>
            {isGoalMet && (
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-500/20">
                <div className="h-2 w-2 rounded-full bg-amber-500" />
              </div>
            )}
          </div>
        )}

        {/* CTA */}
        <Button
          onClick={onStartSession}
          className="w-full h-11 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold shadow-lg shadow-amber-500/25 transition-all duration-200 hover:shadow-xl hover:shadow-amber-500/30 active:scale-[0.98]"
        >
          Démarrer une séance
          <ChevronRight className="ml-1 h-4 w-4" />
        </Button>
      </div>

      {/* Top highlight */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-400/40 to-transparent" />
    </div>
  );
}
